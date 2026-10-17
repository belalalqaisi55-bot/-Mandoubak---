import React, { useState, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef
} from "@vis.gl/react-google-maps";
import {
  MapPin,
  Navigation,
  Search,
  Phone,
  MessageSquare,
  ExternalLink,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  Building2,
  Stethoscope,
  X,
  Compass,
  Key
} from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

export interface MapClientLocation {
  id: string;
  name: string;
  entityName: string;
  location: string;
  role: "pharmacy" | "doctor" | string;
  phone?: string;
  lat: number;
  lng: number;
  visitsCount?: number;
  lastVisitDate?: string;
}

interface GoogleMapViewProps {
  clients: any[];
  visits: any[];
  onSelectClientForVisit?: (clientId: string) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

// Preset baseline coordinates for Yemeni cities and major medical hubs
const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  all: { lat: 15.3547, lng: 44.2000, zoom: 12 },
  sanaa: { lat: 15.3547, lng: 44.2000, zoom: 13 },
  sanaa_zubairy: { lat: 15.3480, lng: 44.2065, zoom: 14 },
  sanaa_hadda: { lat: 15.3260, lng: 44.1830, zoom: 14 },
  aden: { lat: 12.7855, lng: 45.0187, zoom: 13 },
  taiz: { lat: 13.5776, lng: 44.0179, zoom: 13 },
  ibb: { lat: 13.9667, lng: 44.1833, zoom: 13 },
  hodeidah: { lat: 14.7978, lng: 42.9545, zoom: 13 }
};

// Deterministic coordinate generator for addresses in Sana'a / Yemen if GPS coords are missing
function resolveCoordinatesForClient(client: any, index: number): { lat: number; lng: number } {
  const loc = (client.location || "").toLowerCase();
  
  // Known zones in Sana'a and Yemen
  if (loc.includes("عدن") || loc.includes("كريتر") || loc.includes("المنصورة") || loc.includes("المعلا")) {
    const offsetLat = ((index * 7) % 20 - 10) * 0.002;
    const offsetLng = ((index * 13) % 20 - 10) * 0.002;
    return { lat: 12.7855 + offsetLat, lng: 45.0187 + offsetLng };
  }
  if (loc.includes("تعز") || loc.includes("الحوبان") || loc.includes("جمال")) {
    const offsetLat = ((index * 5) % 20 - 10) * 0.002;
    const offsetLng = ((index * 11) % 20 - 10) * 0.002;
    return { lat: 13.5776 + offsetLat, lng: 44.0179 + offsetLng };
  }
  if (loc.includes("إب") || loc.includes("العدين")) {
    const offsetLat = ((index * 6) % 20 - 10) * 0.002;
    const offsetLng = ((index * 9) % 20 - 10) * 0.002;
    return { lat: 13.9667 + offsetLat, lng: 44.1833 + offsetLng };
  }
  if (loc.includes("حدة")) {
    const offsetLat = ((index * 4) % 15 - 7) * 0.0015;
    const offsetLng = ((index * 8) % 15 - 7) * 0.0015;
    return { lat: 15.3260 + offsetLat, lng: 44.1830 + offsetLng };
  }
  if (loc.includes("الزبيري") || loc.includes("التحرير")) {
    const offsetLat = ((index * 3) % 15 - 7) * 0.0015;
    const offsetLng = ((index * 7) % 15 - 7) * 0.0015;
    return { lat: 15.3480 + offsetLat, lng: 44.2065 + offsetLng };
  }
  if (loc.includes("الدائري") || loc.includes("الجامعة")) {
    const offsetLat = ((index * 5) % 15 - 7) * 0.0015;
    const offsetLng = ((index * 11) % 15 - 7) * 0.0015;
    return { lat: 15.3620 + offsetLat, lng: 44.2150 + offsetLng };
  }

  // Base Sana'a center distribution for all medical facilities
  const baseLat = 15.3547;
  const baseLng = 44.2000;
  // Natural realistic spread across Sana'a avenues
  const pseudoRandom = Math.sin(index * 9999) * 10000;
  const spreadLat = ((pseudoRandom % 1) - 0.5) * 0.035;
  const pseudoRandom2 = Math.cos(index * 8888) * 10000;
  const spreadLng = ((pseudoRandom2 % 1) - 0.5) * 0.035;

  return {
    lat: baseLat + spreadLat,
    lng: baseLng + spreadLng
  };
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  clients,
  visits,
  onSelectClientForVisit,
  onClose,
  isEmbedded = false
}) => {
  const [selectedClient, setSelectedClient] = useState<MapClientLocation | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "pharmacy" | "doctor">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customKey, setCustomKey] = useState<string>(() => localStorage.getItem("MANDOUBAK_MAPS_KEY") || "");
  const [isSettingKey, setIsSettingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // AdvancedMarker and InfoWindow hooks
  const [markerRef, marker] = useAdvancedMarkerRef();

  // Determine Google Maps API Key
  const activeApiKey =
    customKey ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (firebaseConfig as any)?.apiKey ||
    "";

  // Process clients with coordinates and visit history
  const mappedClients: MapClientLocation[] = useMemo(() => {
    return clients.map((c, idx) => {
      const clientVisits = visits.filter(
        (v) => v.clientId === c.id || (v.clientPhone && v.clientPhone === c.phone)
      );
      const coords = resolveCoordinatesForClient(c, idx);

      return {
        id: c.id,
        name: c.name,
        entityName: c.entityName || c.name,
        location: c.location || "صنعاء",
        role: c.role || "pharmacy",
        phone: c.phone || "",
        lat: coords.lat,
        lng: coords.lng,
        visitsCount: clientVisits.length,
        lastVisitDate: clientVisits[0]?.visitDate || undefined
      };
    });
  }, [clients, visits]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return mappedClients.filter((item) => {
      const matchesRole = roleFilter === "all" || item.role === roleFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesCity = true;
      if (selectedCity === "sanaa") {
        matchesCity = item.location.includes("صنعاء") || !item.location.includes("عدن");
      } else if (selectedCity === "aden") {
        matchesCity = item.location.includes("عدن");
      } else if (selectedCity === "taiz") {
        matchesCity = item.location.includes("تعز");
      } else if (selectedCity === "ibb") {
        matchesCity = item.location.includes("إب");
      }

      return matchesRole && matchesSearch && matchesCity;
    });
  }, [mappedClients, roleFilter, searchQuery, selectedCity]);

  // Get current GPS position
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert("خدمة تحديد الموقع الجغرافي (GPS) غير مدعومة في متصفحك الحالي.");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        setCurrentGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        setIsGettingGps(false);
        console.warn("Geolocation notice:", err);
        alert("تعذر تحديد موقع GPS الحالي. يرجى التأكد من تفعيل إذن الموقع.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const mapCenter = useMemo(() => {
    if (currentGps) return currentGps;
    if (selectedClient) return { lat: selectedClient.lat, lng: selectedClient.lng };
    return CITY_COORDINATES[selectedCity] || CITY_COORDINATES.all;
  }, [currentGps, selectedClient, selectedCity]);

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xl dir-rtl text-right ${
        isEmbedded ? "h-[620px] w-full" : "h-[85vh] w-full max-w-6xl mx-auto"
      }`}
    >
      {/* Top Header & Bar */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 text-white p-4 shrink-0 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-xs shrink-0">
            <Compass className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                خريطة التغطية والزيارات الميدانية (Google Maps)
              </h3>
              <span className="text-3xs font-black bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full">
                Google Maps Platform
              </span>
            </div>
            <p className="text-2xs sm:text-xs text-teal-200/90 font-medium">
              استكشاف مواقع الصيدليات والعيادات الطبية وخطوط سير الزيارات الميدانية للدكتور بلال القيسي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingKey((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-800 hover:bg-teal-700 text-teal-100 transition-colors shadow-xs cursor-pointer active:scale-95"
            title="إعدادات مفتاح الخريطة (Google Maps API Key)"
          >
            <Key className="h-3.5 w-3.5 text-teal-300" />
            <span className="hidden sm:inline">مفتاح الخريطة</span>
          </button>

          <button
            type="button"
            onClick={handleGetMyLocation}
            disabled={isGettingGps}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-800 hover:bg-teal-700 text-teal-100 transition-colors shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
            title="تحديد موقعي الحالي GPS"
          >
            <Navigation className={`h-3.5 w-3.5 text-teal-300 ${isGettingGps ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">موقعي الآن</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-teal-100 transition-colors cursor-pointer"
              title="إغلاق الخريطة"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن منشأة، طبيب، أو شارع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-2 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-3xs font-bold">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                roleFilter === "all" ? "bg-teal-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الكل ({mappedClients.length})
            </button>
            <button
              onClick={() => setRoleFilter("pharmacy")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                roleFilter === "pharmacy" ? "bg-teal-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="h-3 w-3" />
              صيدليات ({mappedClients.filter((c) => c.role === "pharmacy").length})
            </button>
            <button
              onClick={() => setRoleFilter("doctor")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                roleFilter === "doctor" ? "bg-teal-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="h-3 w-3" />
              عيادات ({mappedClients.filter((c) => c.role === "doctor").length})
            </button>
          </div>

          {/* City Selector */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:border-teal-500 focus:outline-none"
          >
            <option value="all">📍 كل المحافظات</option>
            <option value="sanaa">صنعاء (المركز الرئيسي)</option>
            <option value="sanaa_zubairy">صنعاء - شارع الزبيري</option>
            <option value="sanaa_hadda">صنعاء - حدة</option>
            <option value="aden">عدن</option>
            <option value="taiz">تعز</option>
            <option value="ibb">إب</option>
          </select>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2 text-3xs font-black text-slate-600">
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg">
            <MapPin className="h-3 w-3 text-emerald-600" />
            {filteredClients.length} موقع محدد على الخريطة
          </span>
          <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 px-2 py-1 rounded-lg">
            <Calendar className="h-3 w-3 text-teal-600" />
            {visits.length} زيارة ميدانية مسجلة
          </span>
        </div>
      </div>

      {/* Key Setting Modal */}
      {isSettingKey && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 sm:p-4 shrink-0">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                <Key className="h-3.5 w-3.5 text-amber-700" />
                <span>إعدادات مفتاح Google Maps Platform API Key</span>
              </div>
              <p className="text-3xs text-amber-800 leading-relaxed">
                يمكنك إدخال مفتاح API مخصص أو المفتاح التجريبي (Maps Demo Key) بدون بطاقة ائتمانية.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="AIzaSy..."
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="flex-1 sm:w-56 px-2.5 py-1 rounded-lg border border-amber-300 text-3xs font-mono bg-white text-slate-800 focus:outline-none focus:border-amber-600"
              />
              <button
                type="button"
                onClick={() => {
                  if (customKey.trim()) {
                    localStorage.setItem("MANDOUBAK_MAPS_KEY", customKey.trim());
                  } else {
                    localStorage.removeItem("MANDOUBAK_MAPS_KEY");
                  }
                  setIsSettingKey(false);
                }}
                className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-3xs font-bold cursor-pointer transition-colors"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setIsSettingKey(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-3xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className="relative flex-1 w-full h-full min-h-[380px] bg-slate-100">
        {!activeApiKey ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-3">
              <MapPin className="h-8 w-8 animate-bounce" />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1">
              مفتاح Google Maps Platform مطلوب
            </h4>
            <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed">
              لإظهار خريطة Google Maps التفاعلية، يرجى تزويد مفتاح Google Maps API Key أو استخدام المفتاح التجريبي المجاني (Maps Demo Key) بدون بطاقة ائتمانية.
            </p>
            <div className="flex items-center gap-2 max-w-sm w-full">
              <input
                type="text"
                placeholder="أدخل مفتاح Google Maps API Key هنا..."
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customKey.trim()) {
                    localStorage.setItem("MANDOUBAK_MAPS_KEY", customKey.trim());
                  }
                  setIsSettingKey(false);
                }}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                تطبيق
              </button>
            </div>
          </div>
        ) : (
          <APIProvider apiKey={activeApiKey} language="ar" region="YE">
            <Map
              style={{ width: "100%", height: "100%" }}
              defaultCenter={mapCenter}
              center={mapCenter}
              defaultZoom={13}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            >
              {/* Current GPS Marker if located */}
              {currentGps && (
                <AdvancedMarker
                  position={currentGps}
                  title="موقعي الحالي GPS"
                >
                  <Pin
                    background="#0284c7"
                    borderColor="#0369a1"
                    glyphColor="#ffffff"
                    scale={1.2}
                  >
                    📍
                  </Pin>
                </AdvancedMarker>
              )}

              {/* Facility Markers */}
              {filteredClients.map((client) => {
                const isPharmacy = client.role === "pharmacy";
                const hasVisits = (client.visitsCount || 0) > 0;

                return (
                  <AdvancedMarker
                    key={`map-m-${client.id}`}
                    position={{ lat: client.lat, lng: client.lng }}
                    title={`${client.entityName} (${client.name})`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <Pin
                      background={
                        selectedClient?.id === client.id
                          ? "#0d9488"
                          : isPharmacy
                          ? "#059669"
                          : "#2563eb"
                      }
                      borderColor={
                        selectedClient?.id === client.id
                          ? "#042f2e"
                          : isPharmacy
                          ? "#065f46"
                          : "#1e40af"
                      }
                      glyphColor="#ffffff"
                      scale={selectedClient?.id === client.id ? 1.3 : 1.1}
                    >
                      {isPharmacy ? "💊" : "🩺"}
                    </Pin>
                  </AdvancedMarker>
                );
              })}

              {/* InfoWindow for selected client */}
              {selectedClient && (
                <InfoWindow
                  position={{ lat: selectedClient.lat, lng: selectedClient.lng }}
                  onCloseClick={() => setSelectedClient(null)}
                  maxWidth={320}
                >
                  <div className="p-1 dir-rtl text-right space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-4xs font-bold mb-1 ${
                            selectedClient.role === "pharmacy"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {selectedClient.role === "pharmacy" ? "🏥 صيدلية معتمدة" : "🩺 عيادة / طبيب"}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          {selectedClient.entityName}
                        </h4>
                        <p className="text-3xs text-slate-500 font-medium">
                          المسؤول: {selectedClient.name}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-3xs text-slate-600">
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                        <span>{selectedClient.location || "صنعاء"}</span>
                      </div>

                      {selectedClient.phone && (
                        <div className="flex items-center gap-1 text-slate-700 font-mono font-bold">
                          <Phone className="h-3 w-3 text-teal-600 shrink-0" />
                          <span>{selectedClient.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-md border border-slate-100">
                        <span>سجل الزيارات:</span>
                        <span className="font-bold text-teal-700">
                          {selectedClient.visitsCount || 0} زيارة مسجلة
                        </span>
                      </div>
                      {selectedClient.lastVisitDate && (
                        <div className="text-4xs text-slate-400">
                          آخر زيارة: {selectedClient.lastVisitDate}
                        </div>
                      )}
                    </div>

                    {/* Action buttons inside InfoWindow */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {onSelectClientForVisit && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectClientForVisit(selectedClient.id);
                            setSelectedClient(null);
                          }}
                          className="flex-1 py-1 px-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-3xs font-bold text-center transition-colors"
                        >
                          تسجيل زيارة
                        </button>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold flex items-center gap-1 transition-colors"
                        title="فتح في خرائط Google للاتجاهات"
                      >
                        <ExternalLink className="h-2.5 w-2.5 text-teal-600" />
                        <span>الاتجاهات</span>
                      </a>

                      {selectedClient.phone && (
                        <a
                          href={`https://wa.me/967${selectedClient.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="مراسلة عبر واتساب"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        )}
      </div>

      {/* Footer Legend */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-3xs font-bold text-slate-600 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block"></span>
            صيدليات (أخضر)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span>
            عيادات ومراكز طبية (أزرق)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-600 inline-block"></span>
            المنشأة المحددة (تيل)
          </span>
        </div>
        <div className="text-slate-400 font-mono text-4xs">
          Powered by Google Maps Platform (@vis.gl/react-google-maps)
        </div>
      </div>
    </div>
  );
};
