export const hasAnyValidValue = (obj: Record<string, any>) => {
  return Object.values(obj).some((value) => value !== undefined);
};
