import { supabase } from '../lib/supabase';
import { getAllTrainers } from './trainerService';
import { getAllSubscriptionPlans } from './subscriptionService';

export async function getAdminDashboardStats() {
  try {
    const { count: trainerCount } = await supabase
      .from('trainer_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    const { count: pendingCref } = await supabase
      .from('trainer_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('cref_status', 'pending');

    const trainers = await getAllTrainers();
    // const subscriptions = await getAllSubscriptions(); // No longer available
    const plans = await getAllSubscriptionPlans();

    // For now, calculate dummy totalRevenue as actual subscriptions are not easily available
    const totalRevenue = plans
      .filter((p: any) => p.price_monthly > 0)
      .reduce((sum: number, p: any) => sum + (p?.price_monthly || 0), 0);

    return {
      trainerCount: trainerCount || 0,
      studentCount: studentCount || 0,
      pendingCref: pendingCref || 0,
      totalRevenue,
      subscriptions: 0, // Placeholder as we can't get all subscriptions easily
      activeTrainers: trainers.filter((t: any) => t.cref_status === 'approved').length,
    };
  } catch (error) {
    console.error('[AdminService] getAdminDashboardStats error:', error);
    return {
      trainerCount: 0,
      studentCount: 0,
      pendingCref: 0,
      totalRevenue: 0,
      subscriptions: 0,
      activeTrainers: 0,
    };
  }
}

export async function getAdminPayments() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, trainer_profiles(name), students(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('[AdminService] getAdminPayments error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[AdminService] getAdminPayments exception:', error);
    return [];
  }
}
