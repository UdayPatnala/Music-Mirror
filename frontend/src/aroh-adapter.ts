import { usePlatformStore } from "@aroh/asdk";

export function useArohMusicMirrorBridge() {
  const {
    user: arohUser,
    profile: arohProfile,
    isAuthenticated,
    logout: arohLogout,
    rewardUser
  } = usePlatformStore();

  // Create local mirror profile from AROH credentials
  const getMusicProfile = (defaultGenre = "Rock", defaultGoal = "Relax") => {
    if (!arohUser || !arohProfile) return null;
    return {
      name: arohProfile.displayName,
      email: arohUser.email,
      genre: localStorage.getItem(`music_genre_${arohUser.id}`) || defaultGenre,
      goal: localStorage.getItem(`music_goal_${arohUser.id}`) || defaultGoal
    };
  };

  const updatePreference = (genre: string, goal: string) => {
    if (!arohUser) return;
    localStorage.setItem(`music_genre_${arohUser.id}`, genre);
    localStorage.setItem(`music_goal_${arohUser.id}`, goal);
  };

  // Associate saved playlists and history with AROH IDs to prevent crosstalk
  const getStorageKeys = () => {
    if (!arohUser) return { favorites: "mirror_favs", history: "mirror_hist" };
    return {
      favorites: `music_favs_${arohUser.id}`,
      history: `music_hist_${arohUser.id}`
    };
  };

  const chargeForPremiumTrack = async (trackTitle: string, price = 2) => {
    if (!arohUser) return;
    // Debits user balance
    await rewardUser(arohUser.id, -price, `Unlocked Premium Song: ${trackTitle}`);
  };

  return {
    isAuthenticated,
    getMusicProfile,
    updatePreference,
    getStorageKeys,
    chargeForPremiumTrack,
    logout: arohLogout
  };
}
