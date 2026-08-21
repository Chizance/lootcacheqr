# Generating and printing QR codes

Every bin gets a QR code automatically - there's nothing to set up. Here's how it works and how to get one onto a physical sticker.

## How it works

Each bin has a permanent ID the moment it's created. Its QR code encodes a URL like:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/#/bin/<bin-id>
```

## Scanning a code - use the in-app scanner

The app has its own built-in scanner: tap the **📷** button next to the search bar on the Search tab, point your camera at a bin's code, and it jumps straight to that bin.

This is the recommended way to scan, because your phone's *native* camera app scanning the same code doesn't reliably route into the installed app - depending on your phone and browser, it may just open a new browser tab instead of launching LootcacheQR. That's a platform-level quirk of installed web apps in general, not something specific to this app, and using the in-app scanner sidesteps it entirely.

Because the QR code only encodes the bin's ID (not its contents), you can freely edit or completely empty a bin and the same sticker keeps working - see "Reusing a bin" below.

## Getting a QR label for a bin

1. Open the bin's page in the app.
2. Scroll to the **QR code** section - it's generated instantly on your device (no server round-trip, no internet needed once the page is loaded). The label shows the QR code with "BIN" and the bin's number/name printed beneath it.
3. Tap **Download label to print** to save it as a PNG image to your phone.

## Printing it

A few easy options, roughly in order of convenience:

- **Photo printing app / kiosk** (Walgreens, CVS, etc.) - upload the downloaded PNGs, print as small photos, cut out, tape on. Good if you want them to look nice.
- **Label maker with an app** (e.g. many Brother/Niimbot label printers have a phone app that accepts an image) - print directly onto adhesive label stock sized for your bins.
- **Home printer** - AirPrint/Google Cloud Print the PNG directly from your phone's photo gallery onto sticker paper or plain paper + tape.
- **Batch printing from a computer** - each downloaded label is sized 3.75" × 5", so pasting four into a 2×2 grid in Word exactly fills a 7.5" × 10" sheet with no gaps. Handy if you're labeling many bins at once.

For durability outdoors (this is a backyard inventory, after all), use **laminated labels or clear packing tape over the printed sticker** - regular paper + inkjet ink will not survive rain or humidity.

## Reusing a bin (same sticker, new contents)

When a bin's contents fully change (e.g. seasonal swap), open the bin and tap **Empty this bin (reuse sticker)**. This clears the title, description, tags, items, and photos - but keeps the same bin ID, so the sticker you already taped on keeps pointing to the right record. No need to print a new code.

## If a sticker gets damaged or lost

Just reprint it - go to that bin's page and download the QR code again. It encodes the same permanent bin ID every time, so an old and a reprinted sticker for the same bin are interchangeable.
