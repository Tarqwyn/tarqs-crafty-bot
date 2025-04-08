export type CharacterData = {
  _id: string;
  character_realm: string;
  character_name: string;
  khaz_algar_professions: Profession[];
  level: number;
  realm: string;
  media: string;
};

export interface RecipeData {
  recipe: string;
  crafters: CrafterData;
}

export interface Crafter {
  character_name: string;
  realm: string;
  level: number;
  profession: ProfessionData;
}

export interface CrafterData {
  name: string;
  mediaUrl: string;
  reagents: ReagentData;
  crafters: Crafter[];
}

type Profession = {
  id: number;
  name: string;
  skill_points: string;
  recipes: string[];
};

interface ReagentData {
  reagents: Reagent[];
  optionalReagents: OptionalReagent[];
}

export interface Reagent {
  name: string;
  quantity: number;
  itemId?: string;
}

export interface OptionalReagent {
  name: string;
  quantity: number;
}

interface ProfessionData {
  name: string;
  final_score: number;
}
