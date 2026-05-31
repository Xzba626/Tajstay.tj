export function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  };
}

export function resolveUserNames(user: {
  name: string;
  firstName: string | null;
  lastName: string | null;
}): { firstName: string; lastName: string; fullName: string } {
  const firstName = user.firstName?.trim() || splitDisplayName(user.name).firstName;
  const lastName = user.lastName?.trim() ?? splitDisplayName(user.name).lastName;
  const fullName = buildFullName(firstName, lastName) || user.name.trim();
  return { firstName, lastName, fullName };
}
