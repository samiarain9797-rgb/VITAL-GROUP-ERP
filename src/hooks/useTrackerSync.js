import { useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useTrackerSync(shipments, profile) {
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    // Only admins or specific roles should run the background sync to avoid duplicate requests
    if (profile?.role !== 'admin') return;

    const performSync = async () => {
      try {
        // 1. Get integrations
        const docRef = doc(db, 'settings', 'trackerIntegrations');
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        const integrations = docSnap.data().list || [];
        if (integrations.length === 0) return;

        // 2. Filter shipments that are in transit
        const inTransitShipments = shipments.filter(s => 
          s.status === 'In Transit' && 
          s.vehicleNumber && 
          s.transporterName
        );

        for (const shipment of inTransitShipments) {
          // Find matching integration
          const integration = integrations.find(i => i.providerName?.toLowerCase() === shipment.transporterName?.toLowerCase());
          if (!integration) continue;

          // Fetch location from Tracker API
          try {
            const url = new URL(integration.apiUrl);
            let fetchOptions = {
              method: integration.method,
              headers: {
                'Accept': 'application/json'
              }
            };
            
            if (integration.apiKey && integration.apiKeyHeaderName) {
              fetchOptions.headers[integration.apiKeyHeaderName] = integration.apiKey;
            }

            if (integration.method === 'GET' && integration.vehicleParamName) {
              url.searchParams.append(integration.vehicleParamName, shipment.vehicleNumber);
            } else if (integration.method === 'POST') {
               fetchOptions.headers['Content-Type'] = 'application/json';
               fetchOptions.body = JSON.stringify({
                  [integration.vehicleParamName]: shipment.vehicleNumber
               });
            }

            const response = await fetch(url.toString(), fetchOptions);
            if (!response.ok) continue;
            const data = await response.json();

            // Extract based on dot notation
            const getValue = (obj, path) => {
              if (!path) return undefined;
              return path.split('.').reduce((o, i) => o ? o[i] : undefined, obj);
            };

            const lat = getValue(data, integration.latField);
            const lng = getValue(data, integration.lngField);
            const locText = getValue(data, integration.textField);

            if (lat !== undefined || locText !== undefined) {
              // Create location object
              const newLocation = {
                lat,
                lng,
                address: locText,
                updatedAt: new Date().toISOString()
              };

              // Update shipment document if changed significantly or just update latest
              // (To avoid too many writes, only update if the location text changed or it's been more than 5 mins)
              const lastUpdated = shipment.liveLocation?.updatedAt ? new Date(shipment.liveLocation.updatedAt) : new Date(0);
              const now = new Date();
              const diffMins = (now - lastUpdated) / 60000;

              if (diffMins > 5 || shipment.liveLocation?.address !== locText) {
                await updateDoc(doc(db, 'shipments', shipment.id), {
                  liveLocation: newLocation
                });
                console.log(`[Tracker Sync] Updated location for shipment ${shipment.id} (${shipment.vehicleNumber})`);
              }
            }
          } catch (apiError) {
            console.error(`[Tracker Sync Error] Failed to fetch for ${shipment.vehicleNumber}:`, apiError);
          }
        }
      } catch (err) {
        console.error("Tracker sync error:", err);
      }
    };

    // Run immediately initially, then every 5 minutes
    performSync();
    syncIntervalRef.current = setInterval(performSync, 5 * 60 * 1000);

    return () => clearInterval(syncIntervalRef.current);
  }, [shipments, profile?.role]);
}
