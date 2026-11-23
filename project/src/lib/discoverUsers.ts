import type { UserProfile } from '@/lib/session';
import { US_DEGREES, US_COURSES, PLAN_TAGS, GROUP_TAGS, GOAL_TAGS } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface DiscoverUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  faculty: string;
  degree: string;
  course: string;
  classGroup: string;
  planTag: string;
  groupTag: string;
  goalTag: string;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function facultyFromDegree(degree: string): string {
  const lower = degree.toLowerCase();
  if (lower.includes('periodismo') || lower.includes('comunicación') || lower.includes('publicidad')) return 'FCom';
  if (lower.includes('informática') || lower.includes('industrial') || lower.includes('telecomunicación')) return 'Reina Mercedes';
  if (lower.includes('filosofía') || lower.includes('historia') || lower.includes('psicología') || lower.includes('geografía') || lower.includes('antropología') || lower.includes('filología') || lower.includes('españolas') || lower.includes('ingleses')) return 'Ramón y Cajal';
  if (lower.includes('arquitectura') || lower.includes('bellas')) return 'Cartuja';
  return 'Viapol';
}

export async function fetchDiscoverUsers(excludeEmail?: string): Promise<DiscoverUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as Record<string, unknown>[])
    .filter((row) => excludeEmail ? row.email !== excludeEmail : true)
    .map((row) => ({
      id: String(row.id),
      email: String(row.email ?? ''),
      name: String(row.full_name),
      avatar: getInitials(String(row.full_name)),
      faculty: String(row.faculty ?? facultyFromDegree(String(row.degree))),
      degree: String(row.degree),
      course: String(row.course),
      classGroup: String(row.class_group),
      planTag: String(row.plan_tag ?? ''),
      groupTag: String(row.group_tag ?? ''),
      goalTag: String(row.goal_tag ?? ''),
    }));
}

export { US_DEGREES, US_COURSES, PLAN_TAGS, GROUP_TAGS, GOAL_TAGS };

export type { UserProfile };
