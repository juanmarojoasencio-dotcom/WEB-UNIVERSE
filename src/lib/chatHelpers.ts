import { supabase } from '@/lib/supabase';
import type { Chat } from '@/types';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function groupChatId(groupId: string): string {
  return `grp_${groupId}`;
}

/**
 * Ensures the group chat row exists in `chats` for the given member and
 * registers them in `chat_members` (idempotent). Called when a student joins
 * a community or creates a group, so the group appears instantly in Chats > Grupos.
 */
export async function joinGroupChat(
  groupId: string,
  groupName: string,
  category: string,
  memberCount: number,
  email: string,
): Promise<void> {
  const chatId = groupChatId(groupId);
  const initials = getInitials(groupName);

  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_email', email)
    .maybeSingle();

  if (!existing) {
    await supabase.from('chats').insert({
      chat_id: chatId,
      contact_name: groupName,
      contact_avatar: initials,
      contact_faculty: category,
      last_message: '',
      last_time: '',
      unread: 0,
      chat_type: 'group',
      member_count: memberCount,
      user_email: email,
      peer_email: null,
    });
  }

  const { data: member } = await supabase
    .from('chat_members')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_email', email)
    .maybeSingle();

  if (!member) {
    await supabase.from('chat_members').insert({ chat_id: chatId, user_email: email });
  }
}

/** Removes the member's chat_members row and their group chat row on leave. */
export async function leaveGroupChat(groupId: string, email: string): Promise<void> {
  const chatId = groupChatId(groupId);
  await supabase.from('chat_members').delete().eq('chat_id', chatId).eq('user_email', email);
  await supabase.from('chats').delete().eq('chat_id', chatId).eq('user_email', email);
}

export function canonicalPrivateChatId(emailA: string, emailB: string): string {
  const a = emailA.trim().toLowerCase();
  const b = emailB.trim().toLowerCase();
  return `pm_${[a, b].sort().join('_')}`;
}

export interface PeerInfo {
  email: string;
  fullName: string;
  faculty: string;
  degree: string;
  course: string;
}

function facultyFromDegree(degree: string): string {
  const lower = degree.toLowerCase();
  if (lower.includes('periodismo') || lower.includes('comunicación') || lower.includes('publicidad')) return 'FCom';
  if (lower.includes('informática') || lower.includes('industrial') || lower.includes('telecomunicación')) return 'Reina Mercedes';
  if (lower.includes('filosofía') || lower.includes('historia') || lower.includes('psicología') || lower.includes('geografía') || lower.includes('antropología') || lower.includes('filología') || lower.includes('españolas') || lower.includes('ingleses')) return 'Ramón y Cajal';
  if (lower.includes('arquitectura') || lower.includes('bellas')) return 'Cartuja';
  return 'Viapol';
}

export async function fetchPeerByEmail(email: string): Promise<PeerInfo | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name, faculty, degree, course')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (!data) return null;
  return {
    email: String(data.email),
    fullName: String(data.full_name),
    faculty: String(data.faculty ?? facultyFromDegree(String(data.degree))),
    degree: String(data.degree),
    course: String(data.course),
  };
}

export async function fetchMyProfile(email: string): Promise<PeerInfo | null> {
  return fetchPeerByEmail(email);
}

export async function ensurePrivateChat(
  myEmail: string,
  myProfile: PeerInfo,
  peerEmail: string,
  peerProfile: PeerInfo,
): Promise<Chat | null> {
  const chatId = canonicalPrivateChatId(myEmail, peerEmail);

  const { data: existingMine } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', chatId)
    .eq('user_email', myEmail)
    .maybeSingle();

  if (existingMine) return existingMine as Chat;

  const { data: existingPeer } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', chatId)
    .eq('user_email', peerEmail)
    .maybeSingle();

  if (!existingPeer) {
    await supabase.from('chats').insert([
      {
        chat_id: chatId,
        contact_name: peerProfile.fullName,
        contact_avatar: getInitials(peerProfile.fullName),
        contact_faculty: peerProfile.faculty,
        last_message: '',
        last_time: '',
        unread: 0,
        chat_type: 'private',
        member_count: 2,
        user_email: myEmail,
        peer_email: peerEmail,
      },
      {
        chat_id: chatId,
        contact_name: myProfile.fullName,
        contact_avatar: getInitials(myProfile.fullName),
        contact_faculty: myProfile.faculty,
        last_message: '',
        last_time: '',
        unread: 0,
        chat_type: 'private',
        member_count: 2,
        user_email: peerEmail,
        peer_email: myEmail,
      },
    ]);
  } else {
    await supabase.from('chats').insert({
      chat_id: chatId,
      contact_name: peerProfile.fullName,
      contact_avatar: getInitials(peerProfile.fullName),
      contact_faculty: peerProfile.faculty,
      last_message: '',
      last_time: '',
      unread: 0,
      chat_type: 'private',
      member_count: 2,
      user_email: myEmail,
      peer_email: peerEmail,
    });
  }

  const { data: mine } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', chatId)
    .eq('user_email', myEmail)
    .maybeSingle();

  return mine as Chat | null;
}
