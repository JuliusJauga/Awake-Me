import MapView, { Marker, Polygon } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function App()
{
  const [ points, setPoints ] = useState<any[]>([]);
  const [ currentLocation, setCurrentLocation ] = useState<any>(null);
  const [ inside, setInside ] = useState(false);

  const removePoint = (index: number) =>
  {
    setPoints(prev => sortPointsClockwise(prev.filter((_, i) => i !== index)));
  };
  // continuous tracking
  useEffect(() =>
  {
    let sub: Location.LocationSubscription | null = null;

    (async () =>
    {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1500,
          distanceInterval: 1,
        },
        (loc) =>
        {
          setCurrentLocation(loc.coords);
          if (points.length >= 3)
          {
            setInside(isPointInPolygon(loc.coords, points));
          }
        }
      );
    })();

    // FIXED CLEANUP
    return () =>
    {
      if (sub) sub.remove();
    };
  }, [ points ]);

  useEffect(() =>
  {
    if (currentLocation && points.length >= 3) 
    {
      setInside(isPointInPolygon(currentLocation, points));
    }
    else 
    {
      setInside(false);
    }
  }, [ points, currentLocation ]);


  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        onPress={(e) =>
        {
          const coord = e.nativeEvent.coordinate;
          setPoints((prev) => sortPointsClockwise([ ...prev, coord ]));
        }}
      >
        {points.map((p, i) => (
          <Marker
            key={i}
            coordinate={p}
            pinColor="blue"
            onPress={() => removePoint(i)}  // Remove point on tap
          />
        ))}

        {points.length >= 3 && (
          <Polygon
            coordinates={points}
            strokeColor="blue"
            fillColor="rgba(0,0,150,0.3)"
            strokeWidth={2}
          />
        )}

        {currentLocation && (
          <Marker
            pinColor="red"
            coordinate={currentLocation}
            title="You"
          />
        )}
      </MapView>

      <View style={styles.info}>
        <Text style={{ fontSize: 20 }}>
          {inside ? "🟢 INSIDE AREA" : "🔴 OUTSIDE AREA"}
        </Text>
      </View>
    </View>
  );
}

// polygon check function
function isPointInPolygon(point: any, polygon: any[])
{
  let x = point.latitude;
  let y = point.longitude;

  let inside = false;
  if (polygon.length < 3) return false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++)
  {
    let xi = polygon[ i ].latitude;
    let yi = polygon[ i ].longitude;
    let xj = polygon[ j ].latitude;
    let yj = polygon[ j ].longitude;

    let intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function sortPointsClockwise(points: any[])
{
  // find the center
  const center = {
    latitude:
      points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
    longitude:
      points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
  };

  // sort by angle
  return points.slice().sort((a, b) =>
  {
    const angleA = Math.atan2(a.latitude - center.latitude, a.longitude - center.longitude);
    const angleB = Math.atan2(b.latitude - center.latitude, b.longitude - center.longitude);
    return angleA - angleB;
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  info: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
});
