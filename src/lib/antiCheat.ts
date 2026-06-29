import { supabase } from "./supabase";

type CheatEventType =
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "multi_tab"
  | "resize_suspicious";

type Severity = "low" | "medium" | "high" | "critical";

async function logCheat(
  eventType: CheatEventType,
  severity: Severity,
  metadata: Record<string, unknown> = {}
) {
  const participantId = sessionStorage.getItem("participant_id");
  const quizId = sessionStorage.getItem("quiz_id");
  const sessionToken = sessionStorage.getItem("session_token");

  if (!participantId || !quizId || !sessionToken) return;

  await supabase.rpc("log_cheat_event", {
    p_participant_id: participantId,
    p_quiz_id: quizId,
    p_event_type: eventType,
    p_severity: severity,
    p_metadata: metadata,
    p_session_token: sessionToken,
  });
}

export function setupAntiCheat(roomCode: string) {
  const participantId = sessionStorage.getItem("participant_id");

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      logCheat("tab_hidden", "high", { at: Date.now() });
    }
  };

  const onBlur = () => {
    logCheat("window_blur", "medium", { at: Date.now() });
  };

  const onFullscreenChange = () => {
    if (!document.fullscreenElement) {
      logCheat("fullscreen_exit", "high", { at: Date.now() });
    }
  };

  const onResize = () => {
    const widthRatio = window.innerWidth / screen.availWidth;
    const heightRatio = window.innerHeight / screen.availHeight;

    if (widthRatio < 0.7 || heightRatio < 0.7) {
      logCheat("resize_suspicious", "medium", {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        screenWidth: screen.availWidth,
        screenHeight: screen.availHeight,
      });
    }
  };

  const channel = new BroadcastChannel(`quizroom-${roomCode}`);

  channel.postMessage({
    type: "active_tab_check",
    participantId,
  });

  channel.onmessage = (event) => {
    if (event.data?.type === "active_tab_check") {
      channel.postMessage({
        type: "active_tab_exists",
        participantId,
      });
    }

    if (
      event.data?.type === "active_tab_exists" &&
      event.data?.participantId === participantId
    ) {
      logCheat("multi_tab", "critical", { at: Date.now() });
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onBlur);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  window.addEventListener("resize", onResize);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    window.removeEventListener("resize", onResize);
    channel.close();
  };
}