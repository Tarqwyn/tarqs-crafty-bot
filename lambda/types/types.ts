export interface Reagent {
  name: string;
  quantity: number;
  itemId?: string;
}

export interface ProfessionTier {
  tier: { name: string };
  skill_points: number;
  max_skill_points: number;
  known_recipes: { name: string }[];
}

export interface CharacterProfessions {
  profession: { id: number; name: string };
  tiers: ProfessionTier[];
}

export interface Profession {
  name: string;
  skill_points: string;
  recipes: string[];
}

export interface GuildMemberDocument {
  character_name: string;
  realm: string;
  level: number;
  khaz_algar_professions: Profession[];
}

export interface CrafterDocument extends GuildMemberDocument {
  _id: string;
}

export interface CraftedItem {
  category: string;
  items: string[];
}

export interface SpecialismSubspecialism {
  crafted_items: CraftedItem[];
  max_points: number;
}

export interface SpecialismData {
  [key: string]: {
    [key: string]: SpecialismSubspecialism;
  };
}

export interface SpecialismDocument {
  _id: string;
  crafted_items: CraftedItem[];
  max_points: number;
}

export interface RecipeItem {
  id: number;
  name: string;
  craftedItemId: string;
  spellId: number;
  mediaUrl?: string;
  reagents: {
    reagents: Reagent[];
    optionalReagents: Reagent[];
  };
}

export interface ItemDocument {
  _id: string;
  name: string;
  category: string;
  craftedItemId: string;
  spellId: number;
  mediaUrl: string;
  reagents: Reagent[];
}

export interface ItemCollection {
  [name: string]: {
    recipeId: number;
    craftedItemId: string | null;
    spellId: number | null;
    mediaUrl?: string;
    reagents: {
      reagents: Reagent[];
      optionalReagents: Reagent[];
    };
  };
}

export interface BlizzardMediaAsset {
  key: string;
  value: string;
}

export interface MongoDBSecrets {
  username: string;
  password: string;
  host: string;
}
