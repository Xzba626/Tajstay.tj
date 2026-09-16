import fs from "node:fs";

const p = "src/app/dashboard/owner/page.tsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf('{activeSection === "rooms" && (');
const end = s.indexOf('{activeSection === "bookings" && (');
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}
const replacement = `{activeSection === "rooms" && (
        <section id="rooms" className="scroll-mt-28 space-y-4">
          <div className="owner-section-head">
            <span className="owner-section-head__bar" aria-hidden />
            <h2 className="owner-section-head__title">{m(locale, "owner.sectionRooms")}</h2>
          </div>
          {!hotelId ? (
            <p className="owner-section-lead">{m(locale, "owner.roomsInv.needHotel")}</p>
          ) : (
            <OwnerRoomsInventoryPanel
              locale={locale}
              hotelId={hotelId}
              hotelName={approvedOwnerHotels.find((h) => h.id === hotelId)?.name ?? hotels[0]?.name ?? ""}
            />
          )}
        </section>
      )}

      `;
s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log("OK", start, "->", end);
