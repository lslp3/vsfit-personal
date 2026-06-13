import type { TrainerProfile, Subscription } from './database';

export interface TrainerWithSubscription extends TrainerProfile {
  subscription: Subscription | null;
}

export interface UpdateTrainerData {
  name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  cref?: string;
  instagram?: string;
  location?: string;
  niche?: string;
}
