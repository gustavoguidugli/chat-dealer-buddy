import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAILS = ["guidugli.gustavo@gmail.com", "matheussenacarneiro2322@gmail.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated and is admin/super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Use getClaims for token-based validation (doesn't require active session)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      // Fallback to getUser if getClaims fails
      const { data: { user: fallbackUser } } = await anonClient.auth.getUser();
      if (!fallbackUser) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      var caller = { id: fallbackUser.id, email: fallbackUser.email };
    } else {
      var caller = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action } = body;

    // Check caller permissions
    const { data: callerPerms } = await adminClient
      .from("user_empresa")
      .select("role, empresa_id")
      .eq("user_id", caller.id);

    const callerIsSuperAdmin = SUPER_ADMIN_EMAILS.includes(caller.email ?? "");
    const callerRoles = callerPerms || [];

    const isCallerAdminForEmpresa = (empresaId: number) => {
      if (callerIsSuperAdmin) return true;
      return callerRoles.some(
        (r: any) => r.empresa_id === empresaId && ["admin", "super_admin"].includes(r.role)
      );
    };

    switch (action) {
      case "create_user": {
        const { email, password, full_name, role, empresa_id } = body;

        if (!isCallerAdminForEmpresa(empresa_id)) {
          return new Response(JSON.stringify({ error: "Apenas administradores podem criar usuários" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (role === "super_admin") {
          return new Response(JSON.stringify({ error: "Não é possível criar Super Admins" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Try to create user, or find existing one
        let userId: string;
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (authError) {
          // If user already exists, find them and link to empresa
          if (authError.message.includes("already been registered")) {
            const { data: listData } = await adminClient.auth.admin.listUsers();
            const existingUser = listData?.users?.find((u: any) => u.email === email);
            if (!existingUser) {
              return new Response(JSON.stringify({ error: "Usuário existe mas não foi encontrado" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            // Check if already linked to this empresa
            const { data: existing } = await adminClient
              .from("user_empresa")
              .select("user_id")
              .eq("user_id", existingUser.id)
              .eq("empresa_id", empresa_id)
              .maybeSingle();
            if (existing) {
              return new Response(JSON.stringify({ error: "Usuário já está vinculado a esta empresa" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            userId = existingUser.id;
          } else {
            return new Response(JSON.stringify({ error: authError.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          userId = authData.user.id;
        }

        // userId already set above

        // Insert user_empresa
        await adminClient.from("user_empresa").insert({
          user_id: userId,
          empresa_id,
          role: role || "member",
        });

        // Upsert user_empresa_geral (existing user may already have one)
        await adminClient.from("user_empresa_geral").upsert({
          user_id: userId,
          empresa_id,
        }, { onConflict: "user_id" });

        // Upsert user_permissions
        await adminClient.from("user_permissions").upsert({
          user_id: userId,
          is_admin: role === "admin",
        }, { onConflict: "user_id" });

        return new Response(JSON.stringify({ success: true, user_id: userId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "edit_user": {
        const { user_id, email, full_name, role, ativo, empresa_id } = body;

        // Get target user
        const { data: targetUser } = await adminClient.auth.admin.getUserById(user_id);
        if (SUPER_ADMIN_EMAILS.includes(targetUser?.user?.email ?? "")) {
          return new Response(JSON.stringify({ error: "Super Admin não pode ser editado" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!isCallerAdminForEmpresa(empresa_id)) {
          return new Response(JSON.stringify({ error: "Sem permissão" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (role === "super_admin") {
          return new Response(JSON.stringify({ error: "Não é possível promover a Super Admin" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update auth user
        const updateData: any = {
          user_metadata: { full_name },
        };
        if (email) updateData.email = email;
        if (typeof ativo === "boolean") {
          updateData.ban_duration = ativo ? "none" : "876000h";
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, updateData);
        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update role if provided
        if (role) {
          await adminClient
            .from("user_empresa")
            .update({ role })
            .eq("user_id", user_id)
            .eq("empresa_id", empresa_id);

          await adminClient
            .from("user_permissions")
            .update({ is_admin: role === "admin" })
            .eq("user_id", user_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id, empresa_id, transfer_to } = body;

        const { data: targetUser } = await adminClient.auth.admin.getUserById(user_id);
        if (SUPER_ADMIN_EMAILS.includes(targetUser?.user?.email ?? "")) {
          return new Response(JSON.stringify({ error: "IMPOSSÍVEL excluir o Super Admin!" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!isCallerAdminForEmpresa(empresa_id)) {
          return new Response(JSON.stringify({ error: "Sem permissão para excluir" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Transfer or nullify records
        if (transfer_to) {
          await adminClient.from("atividades").update({ atribuida_a: transfer_to }).eq("atribuida_a", user_id).eq("id_empresa", empresa_id);
          await adminClient.from("leads_crm").update({ proprietario_id: transfer_to }).eq("proprietario_id", user_id).eq("id_empresa", empresa_id);
          await adminClient.from("anotacoes_lead").update({ criado_por: transfer_to }).eq("criado_por", user_id).eq("id_empresa", empresa_id);
          await adminClient.from("historico_lead").update({ usuario_id: transfer_to }).eq("usuario_id", user_id).eq("id_empresa", empresa_id);
        } else {
          await adminClient.from("atividades").update({ atribuida_a: null }).eq("atribuida_a", user_id).eq("id_empresa", empresa_id);
          await adminClient.from("leads_crm").update({ proprietario_id: null }).eq("proprietario_id", user_id).eq("id_empresa", empresa_id);
          await adminClient.from("anotacoes_lead").update({ criado_por: null }).eq("criado_por", user_id).eq("id_empresa", empresa_id);
          await adminClient.from("historico_lead").update({ usuario_id: null }).eq("usuario_id", user_id).eq("id_empresa", empresa_id);
        }

        // Remove from tables
        await adminClient.from("user_empresa").delete().eq("user_id", user_id).eq("empresa_id", empresa_id);
        await adminClient.from("user_empresa_geral").delete().eq("user_id", user_id);
        await adminClient.from("user_permissions").delete().eq("user_id", user_id);

        // Delete auth user
        await adminClient.auth.admin.deleteUser(user_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_user_counts": {
        const { user_id, empresa_id } = body;

        const [atividades, leads, anotacoes, historico] = await Promise.all([
          adminClient.from("atividades").select("id", { count: "exact", head: true }).eq("atribuida_a", user_id).eq("id_empresa", empresa_id),
          adminClient.from("leads_crm").select("id", { count: "exact", head: true }).eq("proprietario_id", user_id).eq("id_empresa", empresa_id),
          adminClient.from("anotacoes_lead").select("id", { count: "exact", head: true }).eq("criado_por", user_id).eq("id_empresa", empresa_id),
          adminClient.from("historico_lead").select("id", { count: "exact", head: true }).eq("usuario_id", user_id).eq("id_empresa", empresa_id),
        ]);

        return new Response(JSON.stringify({
          atividades: atividades.count || 0,
          leads: leads.count || 0,
          anotacoes: anotacoes.count || 0,
          historico: historico.count || 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { email } = body;
        // Use the admin client to generate a password reset link
        const { error } = await adminClient.auth.resetPasswordForEmail(email);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "convidar_usuario": {
        const { email, empresa_id, role } = body;

        if (!isCallerAdminForEmpresa(empresa_id)) {
          return new Response(JSON.stringify({ error: "Sem permissão para convidar" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create invite record
        const { data: convite, error: conviteError } = await adminClient
          .from("convites")
          .insert({
            empresa_id,
            tipo: "link",
            max_usos: 1,
            email_destino: email.toLowerCase(),
            role: role || "member",
            criado_por: caller.id,
          })
          .select("id, token")
          .single();

        if (conviteError) {
          return new Response(JSON.stringify({ error: conviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const baseUrl = body.redirect_base_url || "https://chat-dealer-buddy.lovable.app";
        const acceptUrl = `${baseUrl}/aceitar-convite?convite_id=${convite.id}`;

        // Check if user already exists
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        if (existingUser) {
          // For existing users, send a password reset email as a "notification"
          // They already have an account, just need to accept the invite
          await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: email.toLowerCase(),
            options: {
              redirectTo: acceptUrl,
            },
          });
        } else {
          // New user — invite creates the account and sends email
          const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: acceptUrl,
          });

          if (inviteError) {
            console.error("Invite email error:", inviteError.message);
            // Don't fail - invite record was created
          }
        }

        return new Response(JSON.stringify({ success: true, convite_id: convite.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "aceitar_convite_pos_login": {
        const { convite_id } = body;

        // Use the DB function to accept the invite
        const { data: result, error: rpcError } = await adminClient.rpc("aceitar_convite", {
          p_convite_id: convite_id,
        });

        if (rpcError) {
          return new Response(JSON.stringify({ error: rpcError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const parsed = typeof result === "string" ? JSON.parse(result) : result;
        if (!parsed?.ok) {
          return new Response(JSON.stringify({ error: parsed?.erro || "Erro ao aceitar convite" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Also upsert user_empresa_geral
        await adminClient.from("user_empresa_geral").upsert({
          user_id: caller.id,
          empresa_id: parsed.empresa_id,
        }, { onConflict: "user_id" });

        return new Response(JSON.stringify({ success: true, empresa_id: parsed.empresa_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
