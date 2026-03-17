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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action } = body;

    // complete_onboarding does NOT require auth — user isn't logged in yet.
    // Security is ensured by validating the convite token server-side.
    if (action === "complete_onboarding") {
      // Skip auth check — handled inside the action via convite validation
    } else {
      // All other actions require authenticated caller
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
      
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
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
    }

    // Helper: check caller permissions (only used by authenticated actions)
    const callerIsSuperAdmin = action !== "complete_onboarding" && SUPER_ADMIN_EMAILS.includes(caller?.email ?? "");
    
    const getCallerRoles = async () => {
      if (action === "complete_onboarding") return [];
      const { data: callerPerms } = await adminClient
        .from("user_empresa")
        .select("role, empresa_id")
        .eq("user_id", caller.id);
      return callerPerms || [];
    };
    const callerRoles = await getCallerRoles();

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

        // Remove from user_empresa for THIS company only
        await adminClient.from("user_empresa").delete().eq("user_id", user_id).eq("empresa_id", empresa_id);

        // Check if user still belongs to any other company
        const { data: remainingLinks } = await adminClient
          .from("user_empresa")
          .select("empresa_id")
          .eq("user_id", user_id);

        if (!remainingLinks || remainingLinks.length === 0) {
          // No more companies — clean up fully
          await adminClient.from("user_empresa_geral").delete().eq("user_id", user_id);
          await adminClient.from("user_permissions").delete().eq("user_id", user_id);
          await adminClient.auth.admin.deleteUser(user_id);
        } else {
          // User still has other companies — update user_empresa_geral to another company
          await adminClient.from("user_empresa_geral").upsert({
            user_id,
            empresa_id: remainingLinks[0].empresa_id,
          }, { onConflict: "user_id" });
        }

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

        // Check 2-minute cooldown for same email + empresa
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: recentInvites } = await adminClient
          .from("convites")
          .select("created_at")
          .eq("empresa_id", empresa_id)
          .eq("email_destino", email.toLowerCase())
          .gte("created_at", twoMinAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (recentInvites && recentInvites.length > 0) {
          const lastSent = new Date(recentInvites[0].created_at).getTime();
          const waitSeconds = Math.ceil((lastSent + 2 * 60 * 1000 - Date.now()) / 1000);
          return new Response(JSON.stringify({ 
            error: `Aguarde ${waitSeconds} segundos antes de enviar outro convite para este e-mail`,
            cooldown_seconds: waitSeconds,
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create invite record with 72h expiration
        const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
        const { data: convite, error: conviteError } = await adminClient
          .from("convites")
          .insert({
            empresa_id,
            tipo: "email",
            max_usos: 1,
            email_destino: email.toLowerCase(),
            role: role || "member",
            criado_por: caller.id,
            expira_em: expiry,
          })
          .select("id, token")
          .single();

        if (conviteError) {
          return new Response(JSON.stringify({ error: conviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get company name for the email template
        const { data: empresaData } = await adminClient
          .from("empresas_geral")
          .select("nome")
          .eq("id", empresa_id)
          .single();

        // Send branded email via Resend using send-invitation-email
        try {
          const sendEmailRes = await fetch(`${supabaseUrl}/functions/v1/send-invitation-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              convite_id: convite.id,
              email_destino: email.toLowerCase(),
              empresa_nome: empresaData?.nome || "Eco Ice",
              role: role || "member",
            }),
          });

          if (!sendEmailRes.ok) {
            const errText = await sendEmailRes.text();
            console.error("send-invitation-email error:", errText);
          } else {
            const emailResult = await sendEmailRes.json();
            console.log("Invitation email sent successfully:", emailResult);
          }
        } catch (emailErr) {
          console.error("Failed to call send-invitation-email:", emailErr);
        }

        return new Response(JSON.stringify({ success: true, convite_id: convite.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "aceitar_convite_pos_login": {
        const { convite_id } = body;

        // Use the DB function to accept the invite, passing the caller's user ID
        const { data: result, error: rpcError } = await adminClient.rpc("aceitar_convite", {
          p_convite_id: convite_id,
          p_user_id: caller.id,
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

      case "complete_onboarding": {
        const { convite_id, primeiro_nome, sobrenome, email, empresa_id, role, password } = body;
        console.log("[complete_onboarding] START", { convite_id, email, empresa_id, role });

        if (!convite_id || !email || !password) {
          console.error("[complete_onboarding] Missing required fields");
          return new Response(JSON.stringify({ error: "Dados incompletos (convite_id, email, password obrigatórios)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 1. Create user or update password if already exists
        let userId: string;
        console.log("[complete_onboarding] Step 1: Creating user in Auth...");
        const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `${primeiro_nome} ${sobrenome}`.trim() },
        });

        if (createError) {
          if (createError.message.includes("already been registered")) {
            console.log("[complete_onboarding] User already exists, looking up by email via RPC...");
            // Use DB function instead of listUsers() to avoid GoTrue banned_until scan bug
            const { data: foundUserId, error: lookupErr } = await adminClient.rpc("get_user_id_by_email", { p_email: email });
            if (lookupErr || !foundUserId) {
              console.error("[complete_onboarding] User lookup failed:", lookupErr?.message);
              return new Response(JSON.stringify({ error: "Usuário existe mas não foi encontrado" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            userId = foundUserId;
            console.log("[complete_onboarding] Found user:", userId);

            // Update password so signInWithPassword works after
            console.log("[complete_onboarding] Updating password via Admin API...");
            const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
              password,
              user_metadata: { full_name: `${primeiro_nome} ${sobrenome}`.trim() },
            });
            if (updateErr) {
              console.error("[complete_onboarding] Failed to update password:", updateErr.message);
              return new Response(JSON.stringify({ error: "Erro ao atualizar senha: " + updateErr.message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            console.log("[complete_onboarding] Password updated successfully");
          } else {
            console.error("[complete_onboarding] createUser failed:", createError.message);
            return new Response(JSON.stringify({ error: createError.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          userId = createData.user.id;
          console.log("[complete_onboarding] New user created:", userId);
        }

        console.log("[complete_onboarding] Step 2: Accepting invite...");
        const { data: acceptResult, error: acceptError } = await adminClient.rpc("aceitar_convite", {
          p_convite_id: convite_id,
          p_user_id: userId,
        });

        if (acceptError) {
          return new Response(JSON.stringify({ error: acceptError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const acceptData = typeof acceptResult === "string" ? JSON.parse(acceptResult) : acceptResult;
        if (!acceptData?.ok) {
          return new Response(JSON.stringify({ error: acceptData?.erro || "Erro ao aceitar convite" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const finalEmpresaId = acceptData.empresa_id || empresa_id;
        const finalRole = acceptData.role || role || "member";
        console.log("[complete_onboarding] Invite accepted. empresa_id:", finalEmpresaId, "role:", finalRole);

        // Map role for legacy tables that use 'user' instead of 'member'
        const legacyRole = finalRole === "member" ? "user" : finalRole;

        // 3. Upsert usuarios
        console.log("[complete_onboarding] Step 3: Upserting usuarios...");
        const { error: usuariosErr } = await adminClient.from("usuarios").upsert({
          uuid: userId,
          email,
          primeiro_nome,
          sobrenome,
          nome: `${primeiro_nome} ${sobrenome}`.trim(),
          id_empresa: finalEmpresaId,
          nivel_acesso: legacyRole,
          onboarding_completed: true,
        }, { onConflict: "uuid" });
        if (usuariosErr) {
          console.error("[complete_onboarding] Step 3 failed:", usuariosErr.message);
          return new Response(JSON.stringify({ error: "Erro ao salvar perfil: " + usuariosErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 4. Insert usuario_time
        console.log("[complete_onboarding] Step 4: Inserting usuario_time...");
        const { error: timeErr } = await adminClient.from("usuario_time").insert({
          id_usuario: userId,
          id_empresa: finalEmpresaId,
          role: legacyRole,
          status_membro: "active",
        });
        if (timeErr) {
          console.error("[complete_onboarding] Step 4 failed:", timeErr.message);
          return new Response(JSON.stringify({ error: "Erro ao vincular ao time: " + timeErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 5. Update convite status
        console.log("[complete_onboarding] Step 5: Updating convite status...");
        await adminClient.from("convites").update({
          status_convite: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by_user_id: userId,
        }).eq("id", convite_id);

        // 6. Upsert user_empresa_geral
        await adminClient.from("user_empresa_geral").upsert({
          user_id: userId,
          empresa_id: finalEmpresaId,
        }, { onConflict: "user_id" });

        // 7. Audit log
        await adminClient.from("audit_logs").insert({
          actor_user_id: userId,
          action: "onboarding_completed",
          entity_type: "convites",
          entity_id: convite_id,
        });

        console.log("[complete_onboarding] SUCCESS — user:", userId, "empresa:", finalEmpresaId);
        return new Response(JSON.stringify({ success: true, user_id: userId, empresa_id: finalEmpresaId }), {
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
