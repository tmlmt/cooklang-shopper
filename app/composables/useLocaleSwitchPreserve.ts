export function useLocaleSwitchPreserve() {
  const preserve = useState<boolean>("localeSwitchPreserve", () => false);
  const scrollY = useState<number>("localeSwitchPreserveY", () => 0);

  function setPreserve() {
    if (typeof window === "undefined") return;
    scrollY.value = window.scrollY || 0;
    preserve.value = true;
  }

  function clearPreserve() {
    preserve.value = false;
  }

  return {
    preserve,
    scrollY,
    setPreserve,
    clearPreserve,
  };
}
