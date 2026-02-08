
import React from 'react';
import { Users, Info, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { ChurchGroup } from '../types';

interface ChurchPageProps {
  type: 'Dollar' | 'Muckhart';
  groups: ChurchGroup[];
}

const ChurchPage: React.FC<ChurchPageProps> = ({ type, groups }) => {
  const churchData = {
    Dollar: {
      message: "Nestled in the heart of the community at the foot of the Ochils, Dollar Parish Church has been a beacon of faith for centuries. We are a welcoming congregation committed to serving our local neighbors and fostering a vibrant spiritual life.",
      address: "Dollar, FK14, Scotland",
      service: "Sundays at 11:00 AM",
      image: "https://images.unsplash.com/photo-1548678967-f1fc5d936894?q=80&w=2070&auto=format&fit=crop"
    },
    Muckhart: {
      message: "Muckhart Parish Church offers a peaceful sanctuary in a beautiful rural setting. Our historic building and friendly congregation provide a warm welcome to all who seek spiritual growth and fellowship.",
      address: "Muckhart, FK14 7JL, Scotland",
      service: "Sundays at 9:30 AM",
      image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop"
    }
  };

  const data = churchData[type];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="relative h-[300px] rounded-3xl overflow-hidden shadow-xl">
        <img src={data.image} alt={type} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-md">{type} Parish Church</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-2xl border shadow-sm">
            <div className="flex items-center space-x-2 mb-6 text-indigo-600">
              <span className="p-2 bg-indigo-50 rounded-lg">
                <Info className="w-6 h-6" />
              </span>
              <h2 className="text-2xl font-bold font-serif">A Message from {type}</h2>
            </div>
            <p className="text-lg text-slate-700 leading-relaxed font-serif">
              {data.message}
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600">
                <span className="p-2 bg-indigo-50 rounded-lg">
                  <Users className="w-6 h-6" />
                </span>
                <h2 className="text-2xl font-bold font-serif">Groups & Activities</h2>
              </div>
              <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                {groups.length} active groups
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map(group => (
                <div key={group.id} className="bg-white p-6 rounded-2xl border hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col h-full overflow-hidden">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-600 transition-colors">{group.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2 group-hover:line-clamp-none transition-all duration-500">
                    {group.description}
                  </p>
                  <div className="space-y-2 pt-4 border-t border-slate-50 mt-auto">
                    <div className="flex items-center text-xs text-slate-400">
                      <Calendar className="w-3 h-3 mr-2" />
                      {group.meetingTime}
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                      <Users className="w-3 h-3 mr-2" />
                      Contact: {group.contactPerson}
                    </div>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-slate-100 rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-400">No groups currently listed for {type}.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
            <h3 className="font-bold text-lg mb-4">Church Information</h3>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-indigo-500 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Location</p>
                <p className="text-sm text-slate-500">{data.address}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-indigo-500 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Main Sunday Service</p>
                <p className="text-sm text-slate-500">{data.service}</p>
              </div>
            </div>
            <button className="w-full bg-slate-900 text-white py-3 rounded-xl hover:bg-black transition-colors flex items-center justify-center space-x-2 font-medium">
              <span>View Location on Maps</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="font-bold text-indigo-900 mb-2">Did You Know?</h3>
            <p className="text-sm text-indigo-700 leading-relaxed">
              Our two churches have officially merged to better serve our region, but both historic sites remain active for regular worship and community events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchPage;
