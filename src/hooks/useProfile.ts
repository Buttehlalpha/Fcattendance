import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export type Role = "admin" | "lecturer" | "student";

export function useProfile() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      const role = (roles?.[0]?.role ?? "student") as Role;
      return { profile, role };
    },
  });
  return { ...q, profile: q.data?.profile, role: q.data?.role as Role | undefined };
}
