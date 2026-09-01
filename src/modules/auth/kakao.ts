const KAKAO_ME = 'https://kapi.kakao.com/v2/user/me';

export interface KakaoProfile {
  providerUserId: string;
  email: string | null;
  nickname: string | null;
}

export class KakaoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KakaoAuthError';
  }
}

interface KakaoMeResponse {
  id?: number;
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string };
  };
}

/** Verify a Kakao user access token and return the normalised profile. */
export async function fetchKakaoProfile(accessToken: string): Promise<KakaoProfile> {
  let response: Response;
  try {
    response = await fetch(KAKAO_ME, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new KakaoAuthError(
      `Kakao request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (response.status === 401) {
    throw new KakaoAuthError('Kakao access token is invalid or expired');
  }
  if (!response.ok) {
    throw new KakaoAuthError(`Kakao responded ${response.status}`);
  }

  const body = (await response.json()) as KakaoMeResponse;
  if (body.id === undefined) {
    throw new KakaoAuthError('Kakao response has no user id');
  }
  return {
    providerUserId: String(body.id),
    email: body.kakao_account?.email ?? null,
    nickname: body.kakao_account?.profile?.nickname ?? null,
  };
}
