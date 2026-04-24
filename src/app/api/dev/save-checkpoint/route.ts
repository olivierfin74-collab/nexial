import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json().catch(() => ({}));

    const projectCode = String(body.projectCode || "").trim();
    const title = String(body.title || "Checkpoint").trim();

    if (!projectCode) {
      return NextResponse.json(
        { error: "projectCode is required" },
        { status: 400 }
      );
    }

    // 1) Load project
    const { data: project, error: projectError } = await supabase
      .from("dev_projects")
      .select("id, project_code, project_name")
      .eq("project_code", projectCode)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        {
          error: "Project not found",
          details: projectError?.message || projectCode,
        },
        { status: 404 }
      );
    }

    // 2) Load active snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("dev_snapshots")
      .select("id, snapshot_version, title, content_md, created_at")
      .eq("project_id", project.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      return NextResponse.json(
        {
          error: "Failed to load snapshot",
          details: snapshotError.message,
        },
        { status: 500 }
      );
    }

    // 3) Load latest session
    const { data: session, error: sessionError } = await supabase
      .from("dev_sessions")
      .select("id, session_title, summary_md, next_step_md, started_at, ended_at")
      .eq("project_id", project.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json(
        {
          error: "Failed to load session",
          details: sessionError.message,
        },
        { status: 500 }
      );
    }

    // 4) Build handoff
    const handoffMd = [
      `# ${project.project_name} — Chat Handoff`,
      "",
      `- Project Code: ${project.project_code}`,
      `- Snapshot Version: ${snapshot?.snapshot_version ?? "N/A"}`,
      `- Snapshot Title: ${snapshot?.title ?? "N/A"}`,
      `- Latest Session: ${session?.session_title ?? "N/A"}`,
      "",
      "## Master Snapshot",
      "",
      snapshot?.content_md?.trim() || "_No active snapshot found._",
      "",
      "## Latest Session Summary",
      "",
      session?.summary_md?.trim() || "_No session summary available._",
      "",
      "## Next Step",
      "",
      session?.next_step_md?.trim() || "_No next step defined._",
      "",
      "## Restart Instruction",
      "",
      "- Read the Master Snapshot first",
      "- Do not reopen solved issues",
      "- Continue from the stated Next Step only",
      "- Favor execution over re-analysis",
      "",
    ].join("\n");

    // 5) Mark previous handoffs as not latest
    const { error: resetError } = await supabase
      .from("dev_chat_handoffs")
      .update({ is_latest: false })
      .eq("project_id", project.id)
      .eq("is_latest", true);

    if (resetError) {
      return NextResponse.json(
        {
          error: "Failed to reset previous handoffs",
          details: resetError.message,
        },
        { status: 500 }
      );
    }

    // 6) Insert new handoff
    const { data: inserted, error: insertError } = await supabase
      .from("dev_chat_handoffs")
      .insert({
        project_id: project.id,
        snapshot_id: snapshot?.id ?? null,
        session_id: session?.id ?? null,
        handoff_title: title,
        handoff_md: handoffMd,
        is_latest: true,
      })
      .select("id, handoff_title, handoff_md, created_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: "Failed to create handoff",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      handoffId: inserted.id,
      handoffTitle: inserted.handoff_title,
      createdAt: inserted.created_at,
      handoffMd: inserted.handoff_md,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}