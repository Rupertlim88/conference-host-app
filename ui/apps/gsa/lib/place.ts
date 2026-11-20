/** Where something happens, as the programme prints it: "350D (George R. Brown Convention Center)". No room means no place. */
export function placeOf(room: string, building: string): string {
  if (!room) return "";
  return building ? `${room} (${building})` : room;
}
