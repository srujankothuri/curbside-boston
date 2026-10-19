export const CATEGORIES = [
  "Furniture",
  "Kitchen and dining",
  "Electronics and appliances",
  "Home decor",
  "Books and media",
  "Sports and outdoors",
  "Other",
];

export const CONDITIONS = ["Like new", "Good", "Fair", "Needs repair"];

export const NEIGHBORHOOD_GROUPS = {
  Boston: [
    "Allston",
    "Back Bay",
    "Bay Village",
    "Beacon Hill",
    "Brighton",
    "Charlestown",
    "Chinatown",
    "Dorchester",
    "Downtown",
    "East Boston",
    "Fenway",
    "Hyde Park",
    "Jamaica Plain",
    "Longwood",
    "Mattapan",
    "Mission Hill",
    "North End",
    "Roslindale",
    "Roxbury",
    "South Boston",
    "South End",
    "West End",
    "West Roxbury",
  ],
  Nearby: ["Brookline", "Cambridge"],
};

export const NEIGHBORHOODS = [
  ...NEIGHBORHOOD_GROUPS.Boston,
  ...NEIGHBORHOOD_GROUPS.Nearby,
];
