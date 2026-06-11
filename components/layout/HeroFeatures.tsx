"use client";
import React, { useEffect, useState } from "react";
import ActivityTicker from "./ActivityTicker";
import TopCountries from "./TopCountries";
import InteractiveEvents from "./InteractiveEvents";
import TrendingGrid from "./TrendingGrid";

export default function HeroFeatures() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch('/api/globe-data').then(r => r.json()).then(d => { if (mounted) setEvents(d.events ?? []); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="col-span-1 lg:col-span-2 flex flex-col gap-3">
        <ActivityTicker />
        <InteractiveEvents events={events} />
      </div>

      <div className="col-span-1 flex flex-col gap-3">
        <TopCountries events={events} />
        <TrendingGrid />
      </div>
    </div>
  );
}
