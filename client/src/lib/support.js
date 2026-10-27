// Platform support only. Instructor payment contacts remain on their profiles.
const phone = "01125349769";
const internationalPhone = `20${phone.slice(1)}`;
export const support = Object.freeze({
  phone,
  internationalPhone,
  telephoneUrl: `tel:+${internationalPhone}`,
  whatsappUrl: `https://wa.me/${internationalPhone}`,
  facebookUrl: "https://www.facebook.com/omar.mohamed.931611/",
});
