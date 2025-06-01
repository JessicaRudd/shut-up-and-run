import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shirt, // Main section icon & for shirt items
  Sun,   // For visor, sunglasses
  Wind,  // For jackets, windbreakers
  CloudRain, // For rain-jackets
  Footprints,
  Glasses, // Specifically for sunglasses
  Hand,  // For gloves, mittens
  UserCircle, // For hats, headbands, general headwear
  CheckSquare, // For generic accessories
  HelpCircle // Fallback for unknown categories
} from 'lucide-react';

// Define the type for a clothing suggestion item
export type DressMyRunItem = {
  category: string;
  item: string;
};

// Map clothing categories to icons
const categoryIcons: Record<string, React.ElementType> = {
  "hat": UserCircle,
  "visor": Sun,
  "sunglasses": Glasses,
  "headband": UserCircle,
  "shirt": Shirt,
  "tank-top": Shirt, // Using Shirt as a general top
  "long-sleeve": Shirt, // Using Shirt as a general top
  "base-layer": Shirt, // Using Shirt as a general top
  "mid-layer": Shirt, // Using Shirt as a general top
  "jacket": Wind, // General jacket
  "vest": Shirt, // No specific vest icon, using Shirt as upper body garment
  "windbreaker": Wind,
  "rain-jacket": CloudRain,
  "shorts": Footprints, // Representing lower body wear
  "capris": Footprints, // Representing lower body wear
  "tights": Footprints, // Representing lower body wear
  "pants": Footprints, // Representing lower body wear
  "gloves": Hand,
  "mittens": Hand,
  "socks": Footprints, // Representing footwear related
  shoes: Footprints,
  "gaiter": UserCircle, // Often neck/headwear
  "balaclava": UserCircle, // Headwear
  "accessory": CheckSquare, // Generic accessory
};

const getIconForCategory = (category: string): React.ElementType => {
  const lowerCategory = category.toLowerCase().trim().replace('-', ' '); // Normalize hyphens too

  // Direct match
  if (categoryIcons[lowerCategory]) {
    return categoryIcons[lowerCategory];
  }
  return HelpCircle; // Default to HelpCircle if no match
};

interface DressMyRunSectionProps {
  suggestion: DressMyRunItem[] | null | undefined | string;
}

export const DressMyRunSection: React.FC<DressMyRunSectionProps> = ({ suggestion }) => {
  const renderContent = () => {
    if (suggestion === null || suggestion === undefined) {
      return <p className="text-muted-foreground">Clothing suggestion is being generated...</p>;
    }

    if (typeof suggestion === 'string') {
      // Defensive check: if suggestion is a string, the AI/flow didn't produce the expected array.
      return (
        <>
          <p className="text-muted-foreground">Clothing suggestions are in an unexpected format.</p>
          <p className="text-sm mt-2">Raw suggestion: {suggestion}</p>
        </>
      );
    }

    if (suggestion.length === 0) {
      return <p className="text-muted-foreground">No specific clothing suggestions available at this time. This could be due to unavailable weather data or the AI not providing details.</p>;
    }
    return (
      <ul className="space-y-3">
        {suggestion.map((item, index) => {
          const Icon = categoryIcons[item.category.toLowerCase()] || Shirt;
          return (
            <li key={index} className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-primary" />
              <span>{item.item}</span>
            </li>
          );
        })}
        <p className="text-xs text-muted-foreground italic pt-3">
          Based on conditions around the recommended run time.
        </p>
      </ul>
    );
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <Shirt className="mr-2 h-6 w-6 text-primary" />
          Dress Your Run
        </CardTitle>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default DressMyRunSection;