import React from "react";
import Link from "next/link";
import { MapPin, Calendar, Tag, ArrowRight } from "lucide-react";

export interface ItemCardProps {
  id: string;
  type: "lost" | "found";
  title: string;
  description: string;
  category: string;
  location: string;
  date_time: string;
  image_url?: string;
  status: string;
  detected_objects?: string[];
}

export function ItemCard({
  id,
  type,
  title,
  description,
  category,
  location,
  date_time,
  image_url,
  status,
  detected_objects = [],
}: ItemCardProps) {
  const isLost = type === "lost";

  return (
    <div className="custom-card custom-card-hover rounded-lg overflow-hidden flex flex-col group">
      <div className="relative h-48 bg-[#EAE7E1] overflow-hidden flex items-center justify-center">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-[#72787E] text-xs font-mono tracking-wider flex flex-col items-center gap-1">
            <Tag size={24} className="opacity-40" />
            <span>NO IMAGE PROVIDED</span>
          </div>
        )}
        
        {/* Status & Type Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full shadow-sm ${
              isLost
                ? "bg-[#8C2D19] text-white"
                : "bg-[#2E4A3E] text-white"
            }`}
          >
            {type}
          </span>
          {status === "matched" && (
            <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-amber-600 text-white shadow-sm">
              Matched
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#72787E] font-medium">
            <span className="flex items-center gap-1">
              <Tag size={13} className="text-[#2E4A3E]" />
              {category}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Calendar size={13} />
              {date_time}
            </span>
          </div>

          <h3 className="font-display text-lg font-bold text-[#1E2022] group-hover:text-[#2E4A3E] transition-colors line-clamp-1">
            {title}
          </h3>

          <p className="text-sm text-[#4A5056] line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-[#E5E2DC] flex items-center justify-between">
          <span className="text-xs text-[#72787E] flex items-center gap-1 font-medium truncate max-w-[180px]">
            <MapPin size={13} className="text-[#D97706] shrink-0" />
            {location}
          </span>

          <Link
            href={`/item/${id}`}
            className="text-xs font-semibold text-[#2E4A3E] hover:text-[#1E2022] flex items-center gap-1 transition-colors"
          >
            Details <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MatchConfidenceBar({
  imageSim,
  textSim,
  contextScore,
  totalScore,
}: {
  imageSim: number | null;
  textSim: number;
  contextScore: number;
  totalScore: number;
}) {
  const percentage = Math.round(totalScore * 100);
  const hasImage = imageSim != null;

  // Weight labels adapt to the scoring mode
  const imgWeight = hasImage ? 60 : 0;
  const txtWeight = hasImage ? 25 : 70;
  const ctxWeight = hasImage ? 15 : 30;

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E2DC] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#72787E] uppercase tracking-wider">
          Match Confidence
          {!hasImage && (
            <span className="ml-1.5 text-[10px] text-[#D97706] font-mono normal-case">
              (text-only)
            </span>
          )}
        </span>
        <span className="font-display text-2xl font-bold text-[#2E4A3E]">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#EAE7E1] h-2.5 rounded-full overflow-hidden flex">
        {hasImage && (
          <div
            className="bg-[#2E4A3E] h-full transition-all duration-500"
            style={{ width: `${Math.round(imageSim * imgWeight)}%` }}
            title={`Image (${imgWeight}% weight): ${Math.round(imageSim * 100)}%`}
          />
        )}
        <div
          className="bg-[#D97706] h-full transition-all duration-500"
          style={{ width: `${Math.round(textSim * txtWeight)}%` }}
          title={`Text (${txtWeight}% weight): ${Math.round(textSim * 100)}%`}
        />
        <div
          className="bg-[#4A5056] h-full transition-all duration-500"
          style={{ width: `${Math.round(contextScore * ctxWeight)}%` }}
          title={`Context (${ctxWeight}% weight): ${Math.round(contextScore * 100)}%`}
        />
      </div>

      {/* Metric Breakdown Chips */}
      <div className={`grid ${hasImage ? "grid-cols-3" : "grid-cols-2"} gap-2 text-center text-[11px] font-mono pt-1`}>
        {hasImage ? (
          <div className="bg-white border border-[#E5E2DC] rounded p-1.5">
            <span className="block text-[#72787E]">Visual ({imgWeight}%)</span>
            <span className="font-bold text-[#2E4A3E]">{Math.round(imageSim * 100)}%</span>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-[#E5E2DC] rounded p-1.5 opacity-60">
            <span className="block text-[#72787E]">Visual</span>
            <span className="font-bold text-[#72787E]">N/A</span>
          </div>
        )}
        <div className="bg-white border border-[#E5E2DC] rounded p-1.5">
          <span className="block text-[#72787E]">Text ({txtWeight}%)</span>
          <span className="font-bold text-[#D97706]">{Math.round(textSim * 100)}%</span>
        </div>
        <div className="bg-white border border-[#E5E2DC] rounded p-1.5">
          <span className="block text-[#72787E]">Context ({ctxWeight}%)</span>
          <span className="font-bold text-[#1E2022]">{Math.round(contextScore * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
