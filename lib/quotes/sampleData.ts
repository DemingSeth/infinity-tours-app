import type { QuoteData } from "./types";

// A fresh, empty quote. Used by the "New" action and when creating a quote row.
export function blankQuote(): QuoteData {
  const year = String(new Date().getFullYear());
  return {
    group: "Group Name",
    destination: "Destination",
    year,
    hostName: "",
    hostPhone: "",
    embassyName: "US Embassy",
    embassyPhone: "",
    tripLinks: [
      { label: "Detailed Itinerary", url: "" },
      { label: "F.A.Q.", url: "" },
    ],
    roomingLink: { label: "Rooming List", url: "" },
    activitiesLink: { label: "Activities Schedule with Names", url: "" },
    hotels: [{ city: "CITY", items: [{ name: "", addr: "", url: "" }] }],
    days: [{ date: "Day 1", rows: [{ time: "", text: "" }], overnight: "" }],
    heroPhotoUrl: "",
  };
}

// The Cantorum Chamber Choir demo, ported from the design prototype. Inline
// links are encoded as Markdown — [label](url) — exactly as the form edits them.
const DET =
  "https://docs.google.com/document/d/1PPRRo3faDFLolG_D9TUBYKc_UhfOOAzFzRGAdgWtXpQ/edit?usp=sharing";

export function sampleQuote(): QuoteData {
  return {
    group: "Cantorum Chamber Choir",
    destination: "United Kingdom",
    year: "2022",
    hostName: "Mike Crockett",
    hostPhone: "(801) 885-3780",
    embassyName: "US Embassy",
    embassyPhone: "(44) (0)20 7499-9000",
    tripLinks: [
      { label: "Detailed Itinerary", url: DET },
      { label: "F.A.Q.", url: "https://docs.google.com/document/d/1d3waT5z9C1462DG0RI5GJSWbKPu07DNKUvNFt_vxsCM/edit" },
      { label: "Google Photo Share", url: "https://photos.app.goo.gl/7kFLZsWweGunDxQk6" },
    ],
    roomingLink: { label: "Rooming List", url: "https://drive.google.com/file/d/1JQeeo3IoZyTpzIF7ds7HmEYHwZOq5MF9/view?usp=sharing" },
    activitiesLink: { label: "Activities Schedule with Names", url: "https://drive.google.com/file/d/18WLbIVo_nY_tK46_I-gxY5ocnimpiMaQ/view?usp=sharing" },
    hotels: [
      { city: "Stratford", items: [
        { name: "Double Tree", addr: "Arden St, Stratford-upon-Avon CV37 6QQ, United Kingdom", url: "https://www.hilton.com/en/hotels/bhxsadi-doubletree-stratford-upon-avon/" },
        { name: "Swans Nest", addr: "Banbury Rd, Bridge Foot, Stratford-upon-Avon CV37 7LT, United Kingdom", url: "https://swansnesthotel.co.uk/about/" },
      ]},
      { city: "Cardiff", items: [
        { name: "Marriott", addr: "Mill Ln, Cardiff CF10 1EZ, United Kingdom", url: "https://www.marriott.com/en-us/hotels/cwldt-cardiff-marriott-hotel/photos/" },
      ]},
      { city: "Bath", items: [
        { name: "Hampton Inn", addr: "Avon St, Bath BA1 1UP, United Kingdom", url: "https://www.hilton.com/en/hotels/batumhx-hampton-bath-city/gallery/" },
      ]},
      { city: "London", items: [
        { name: "Hampton Inn", addr: "157 Waterloo Rd, London SE1 8XA, United Kingdom", url: "https://www.hilton.com/en/hotels/" },
      ]},
    ],
    days: [
      { date: "Wed. June 29", rows: [
        { time: "", text: "Meet at SLC Airport" },
        { time: "", text: `[Flight Confirmation](${DET})` },
        { time: "6:00 pm", text: "Check into flight Delta Flight 50" },
        { time: "8:50 pm", text: "Depart on Delta Flight 220 for London" },
      ], overnight: "" },
      { date: "Thu. June 30", rows: [
        { time: "1:30 pm", text: "Arrive in London Heathrow Airport" },
        { time: "2:30 pm", text: "Depart for Stratford-upon-Avon" },
        { time: "4:30 pm", text: "Last Entry to Birthplace" },
        { time: "5:30 pm", text: "Check into Hotel" },
        { time: "", text: "Dinner on your own" },
        { time: "7:30 pm", text: "Optional Activity: [Shakespeare Richard III](https://www.shakespeare.org.uk/explore-shakespeare/shakespedia/shakespeares-plays/richard-iii/)" },
      ], overnight: "Stratford-upon-Avon - [DoubleTree](https://www.hilton.com/en/hotels/bhxsadi-doubletree-stratford-upon-avon/) and [Swans Nest Hotel](https://swansnesthotel.co.uk/about/)" },
      { date: "Fri. July 1", rows: [
        { time: "8:00 am", text: `Breakfast at hotel [Performance attire](${DET})` },
        { time: "", text: "Depart for [Cotswolds](https://youtu.be/kqOTwn313O8), Meet Guide for tour of Cotswolds in Stratford-upon-Avon" },
        { time: "", text: "Chipping Campden, [Stow on the Wold](https://www.cotswolds.com/plan-your-trip/towns-and-villages/stow-on-the-wold-p670753), [Bourton on the Water](https://www.cotswolds.com/plan-your-trip/towns-and-villages/bourton-on-the-water-p670103)" },
        { time: "11:00 am", text: "Depart for [Worcester Cathedral](https://www.worcestercathedral.co.uk/) Box'd Lunch will be provided" },
        { time: "12:30 pm", text: "Midday Concert at [Worcester Cathedral](https://www.worcestercathedral.co.uk/)" },
        { time: "1:30 pm", text: "Depart for Cardiff" },
        { time: "4:00 pm", text: "Arrive in Cardiff Check into Festival and Hotel, Rehearsal for Opening Concert" },
        { time: "7:30 pm", text: "Festival Opening Concert, [Tabernacle Chapel](https://www.google.com/maps/dir//Tabernacle+Welsh+Baptist+Chapel)" },
      ], overnight: "Cardiff Hotel - [Marriott](https://www.marriott.com/en-us/hotels/cwldt-cardiff-marriott-hotel/photos/)" },
      { date: "Sat. July 2", rows: [
        { time: "9:00 am", text: `Breakfast at hotel [Performance attire](${DET})` },
        { time: "11:45 am", text: "Freetime in Cardiff" },
        { time: "", text: "Rehearsal and Festival (see Detailed Itinerary for exact start and end times)" },
        { time: "3:30 pm", text: "Sightseeing in Cardiff Bay" },
        { time: "7:00 pm", text: "Category Competitions, [Hoddinott Hall](https://www.google.com/maps/dir//Hoddinott+Hall,+Cardiff+Bay)" },
        { time: "9:30 pm", text: "Choir of Choirs Competition" },
      ], overnight: "Return to Cardiff Hotel - [Marriott](https://www.marriott.com/en-us/hotels/cwldt-cardiff-marriott-hotel/photos/)" },
      { date: "Sun. July 3", rows: [
        { time: "", text: `Breakfast at hotel [Performance attire](${DET})` },
        { time: "", text: "Check out of Hotel" },
        { time: "", text: "Choral Festival in Cardiff" },
        { time: "", text: "Change from Concert Dress" },
        { time: "10:00 am", text: "Depart for Bath" },
        { time: "3:00 pm", text: "Arrive in Bath" },
        { time: "", text: "Check into Hotel" },
        { time: "4:30 pm", text: "Sightseeing in [Bath](https://www.thecrazytourist.com/15-best-things-to-do-in-bath-somerset-england/) (Jane Austin House, Roman Baths, Bath Abbey)" },
      ], overnight: "Bath, UK - [Hampton by Hilton](https://www.hilton.com/en/hotels/batumhx-hampton-bath-city/gallery/)" },
      { date: "Mon. July 4", rows: [
        { time: "", text: `Breakfast at hotel [Performance attire](${DET})` },
        { time: "9:00 am", text: "Sightseeing in Bath" },
        { time: "", text: "Jane Austin House, Bath Abbey," },
        { time: "11:30 am", text: "Depart for Wells Cathedral" },
        { time: "12:30 pm", text: "Arrive at [Wells Cathedral](https://www.wellscathedral.org.uk/your-visit/explore-wells-cathedral/) (video)(architecture)" },
        { time: "1:05 pm", text: "Midday Recital at Wells Cathedral" },
        { time: "1:45 pm", text: "Recital Ends" },
        { time: "2:00 pm", text: "Depart for Oxford" },
        { time: "5:00 pm", text: "Rehearsal at [Christ Church](https://www.youtube.com/watch?v=nY4RElKhRNA)" },
        { time: "6:00 pm", text: "Evensong Performance at Christ Church" },
        { time: "7:00 pm", text: "Dinner in Oxford" },
        { time: "8:30 pm", text: "Oxford Walking Ghost tour" },
        { time: "10:00 pm", text: "Depart for London" },
      ], overnight: "Check into Waterloo [Hampton by Hilton](https://www.hilton.com/en/hotels/)" },
      { date: "Tue. July 5", rows: [
        { time: "7:30 am", text: `Breakfast at hotel [Performance attire](${DET})` },
        { time: "8:15 am", text: "Depart for Churchill War Rooms" },
        { time: "9:00 am", text: "Private Tour of [Churchill War Rooms](https://youtu.be/zj7-isBtLKg) (life of a typist)" },
        { time: "10:30 am", text: "St. James Park, [Buckingham Palace](https://www.rct.uk/visit/buckingham-palace)" },
        { time: "11:00 am", text: "Changing of the Guard @ Buckingham Palace" },
        { time: "11:30 am", text: "Lunch on your own and Travel to St. James" },
        { time: "1:00 pm", text: "Performance at St. James Sussex Gardens" },
        { time: "2:00 pm", text: "Free time in London or Depart for London Dungeon" },
        { time: "3:15 pm", text: "Optional [London Dungeon](https://www.thedungeons.com/london/)" },
        { time: "5:00 pm", text: "Free time in London" },
        { time: "7:30 pm", text: "Optional: [Mousetrap](https://www.agathachristie.com/stories/the-mousetrap)" },
        { time: "8:00 pm", text: "Optional: [SIX](https://www.sixthemusical.com/london/about)" },
      ], overnight: "London Waterloo" },
      { date: "Wed. July 6", rows: [
        { time: "9:00 am", text: `Breakfast at hotel [Performance attire](${DET})` },
        { time: "12:00 pm", text: "[Tower of London](https://www.hrp.org.uk/tower-of-london/history-and-stories/the-story-of-the-tower-of-london/)" },
        { time: "1:00 pm", text: "Rehearsal at St. Stephen's Walbrooks" },
        { time: "2:00 pm", text: "Christopher Wren Chapel" },
        { time: "", text: "Afternoon Recital" },
        { time: "7:00 pm", text: "Free time in London" },
        { time: "", text: "Optional [My Fair Lady](https://www.londontheatre.co.uk/show/24277-my-fair-lady)" },
      ], overnight: "London" },
      { date: "Thurs. July 7", rows: [
        { time: "Morning", text: "Breakfast at hotel" },
        { time: "", text: "TBD London Activities" },
        { time: "12:00 pm", text: "Depart for Heathrow" },
        { time: "12:30 pm", text: "Arrive at Heathrow and check in for Delta 051" },
        { time: "3:20 pm", text: "Depart for SLC" },
        { time: "6:50 pm", text: "Arrive in SLC" },
      ], overnight: "" },
    ],
    heroPhotoUrl: "",
  };
}
