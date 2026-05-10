import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Navigation, QrCode, Share2 } from 'lucide-react';
import { Button } from './ui/Button';

export function StoreInfoView() {
  const { storeConfig } = useAppStore();

  if (!storeConfig) return null;

  const handleOpenMap = () => {
    const query = encodeURIComponent(storeConfig.storeInfo.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleShare = async () => {
    const text = `Hone Dukaan par order karein! ${window.location.origin}`;
    if (navigator.share) {
      await navigator.share({ title: 'Hone Dukaan', text, url: window.location.origin });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Link copy ho gaya! WhatsApp par bhej dein.');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-3xl bg-white p-8 shadow-sm border text-center space-y-4">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 italic font-black text-3xl text-orange-600 border-4 border-white shadow-sm">
          {storeConfig.storeInfo.name[0]}
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{storeConfig.storeInfo.name}</h2>
          <p className="text-gray-500 font-medium">Malik: {storeConfig.storeInfo.ownerName}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-sm border transition-all hover:border-orange-200">
          <div className="rounded-2xl bg-orange-50 p-3">
            <MapPin className="h-6 w-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Address</p>
            <p className="font-bold text-gray-900 mt-1">{storeConfig.storeInfo.address}</p>
            <Button 
                onClick={handleOpenMap}
                className="mt-4 w-full bg-gray-900 hover:bg-black py-4"
            >
              <Navigation className="mr-2 h-4 w-4" /> Raste mein (Open Maps)
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl bg-white p-6 shadow-sm border">
          <div className="rounded-2xl bg-orange-50 p-3">
            <Phone className="h-6 w-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Phone</p>
            <a href={`tel:${storeConfig.storeInfo.phone}`} className="text-xl font-black text-gray-900 mt-1 block">
              +91 {storeConfig.storeInfo.phone}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl bg-white p-6 shadow-sm border">
          <div className="rounded-2xl bg-blue-50 p-3">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Timing</p>
            <p className="text-xl font-black text-gray-900 mt-1 uppercase">
              {storeConfig.storeInfo.operatingHours}
            </p>
            {!storeConfig.isOpen && (
              <p className="text-sm font-bold text-red-600 mt-1 italic">
                Abhi Band Hai: {storeConfig.reopenMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-white text-center shadow-lg space-y-6">
        <h3 className="text-2xl font-black">Dosto ko batayein</h3>
        <p className="text-orange-100 font-medium">Scan karke app install karein ya link bhejien</p>
        
        <div className="mx-auto w-48 h-48 bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
          <QrCode className="w-full h-full text-gray-900" />
        </div>

        <Button 
          onClick={handleShare}
          className="w-full bg-white text-orange-600 hover:bg-orange-50 py-6 text-lg font-black border-none shadow-sm"
        >
          <Share2 className="mr-2 h-6 w-6" /> WhatsApp par bhejein
        </Button>
      </div>
    </div>
  );
}
