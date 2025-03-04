import * as unicodedata from "unorm";

export function cleanCharacterName(name: string): string {
    return unicodedata.nfkd(name) 
        .replace(/[^A-Za-z0-9-_+=.@!]/g, ""); 
}