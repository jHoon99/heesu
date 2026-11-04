"use client";

import { useCallback, useEffect, useState } from "react";
import { GUARDIAN_TOKEN_RE, readTokenFromHash } from "../model/guardian";

const STORAGE_KEY = "hs-guardian-token";

function readStored(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v !== null && GUARDIAN_TOKEN_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStored(token: string | null) {
  try {
    if (token === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 쓴다.
  }
}

/**
 * 토큰은 주소 fragment(#t=…)로만 들어온다. 읽은 즉시 주소창에서 지우고, 새로고침(카카오톡 인앱 브라우저)을 위해
 * 이 탭의 sessionStorage에만 둔다. fragment가 있으면(형식이 틀려도) storage로 되돌아가지 않는다.
 */
export function useGuardianToken(): {
  token: string | null;
  ready: boolean;
  forget: () => void;
} {
  const [state, setState] = useState<{ token: string | null; ready: boolean }>({
    token: null,
    ready: false,
  });

  useEffect(() => {
    let token: string | null;
    if (location.hash !== "") {
      token = readTokenFromHash(location.hash);
      writeStored(token);
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
    } else {
      token = readStored();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL fragment and storage once after mount (SSR-safe)
    setState({ token, ready: true });
  }, []);

  const forget = useCallback(() => {
    writeStored(null);
    setState({ token: null, ready: true });
  }, []);

  return { ...state, forget };
}
