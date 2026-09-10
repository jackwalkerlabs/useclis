import snapshots from './profiles.json';
import activity from './activity.json';
import { tools } from './tools';
import { ownerKey, ownerStats } from '../lib/profiles';

export const profiles = Object.entries(snapshots).map(([key, profile]) => {
  const listings = tools.filter(tool => ownerKey(tool.repo) === key).sort((a, b) => b.stars - a.stars);
  return { ...profile, key, avatar: `/avatars/${key}.png`, listings, ...ownerStats(listings, activity) };
}).filter(profile => profile.listings.length).sort((a, b) => b.stars - a.stars);
