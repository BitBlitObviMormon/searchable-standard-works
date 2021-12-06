// A map of maps of maps of strings: scriptures[book][chapter][verse]
var scriptures = {};

// All of the files to read, hosted on my own web page.
// See: https://github.com/BitBlitObviMormon/searchable-standard-works
const PROVIDER = "https://bitblitobvimormon.github.io/searchable-standard-works/"
const FILES = [
	"bible/01.genesis",
	"bible/02.exodus",
	"bible/03.leviticus",
	"bible/04.numbers",
	"bible/05.deuteronomy",
	"bible/06.joshua",
	"bible/07.judges",
	"bible/08.ruth",
	"bible/09.1-samuel",
	"bible/10.2-samuel",
	"bible/11.1-kings",
	"bible/12.2-kings",
	"bible/13.1-chronicles",
	"bible/14.2-chronicles",
	"bible/15.ezra",
	"bible/16.nehemiah",
	"bible/17.esther",
	"bible/18.job",
	"bible/19.psalms",
	"bible/20.proverbs",
	"bible/21.ecclesiastes",
	"bible/22.song-of-solomon",
	"bible/23.isaiah",
	"bible/24.jeremiah",
	"bible/25.lamentations",
	"bible/26.ezekiel",
	"bible/27.daniel",
	"bible/28.hosea",
	"bible/29.joel",
	"bible/30.amos",
	"bible/31.obadiah",
	"bible/32.jonah",
	"bible/33.micah",
	"bible/34.nahum",
	"bible/35.habakkuk",
	"bible/36.zephaniah",
	"bible/37.haggai",
	"bible/38.zechariah",
	"bible/39.malachi",
	"bible/40.matthew",
	"bible/41.mark",
	"bible/42.luke",
	"bible/43.john",
	"bible/44.acts",
	"bible/45.romans",
	"bible/46.1-corinthians",
	"bible/47.2-corinthians",
	"bible/48.galatians",
	"bible/49.ephesians",
	"bible/50.philippians",
	"bible/51.colossians",
	"bible/52.1-thessalonians",
	"bible/53.2-thessalonians",
	"bible/54.1-timothy",
	"bible/55.2-timothy",
	"bible/56.titus",
	"bible/57.philemon",
	"bible/58.hebrews",
	"bible/59.james",
	"bible/60.1-peter",
	"bible/61.2-peter",
	"bible/62.1-john",
	"bible/63.2-john",
	"bible/64.3-john",
	"bible/65.jude",
	"bible/66.revelation",
	"bofm/01.1-nephi",
	"bofm/02.2-nephi",
	"bofm/03.jacob",
	"bofm/04.enos",
	"bofm/05.jarom",
	"bofm/06.omni",
	"bofm/07.words-of-mormon",
	"bofm/08.mosiah",
	"bofm/09.alma",
	"bofm/10.helaman",
	"bofm/11.3-nephi",
	"bofm/12.4-nephi",
	"bofm/13.mormon",
	"bofm/14.ether",
	"bofm/15.moroni",
	"dnc/01.doctrine-and-covenants",
	"pofgp/01.Moses",
	"pofgp/02.Abraham",
	"pofgp/03.Facsimile",
	"pofgp/04.Joseph-Smith-Matthew",
	"pofgp/05.Joseph-Smith-History",
	"pofgp/06.Articles-of-Faith",
	"pofgp/07.Proclamation"
]

// This gets incremented every time a file is finished reading.
var progress = 0;

// Reports the loading progress and unlocks the search bar once finished
function reportProgress(progress) {
	if (progress < FILES.length)
		document.getElementById("content").innerHTML = "Wait for a moment, loading... " + progress + "/" + FILES.length;
	else {
		document.getElementById("content").style.visibility = "hidden";
		document.getElementById("searchbar").disabled = false;
	}
}

// Searches all of the scripture references using text as a parameter. Returns a formatted string.
function search(text) {
	// Return early if the string is nonexistent or too small.
	if (text === null) return "";
	if (text.length < 2) return "";

	// Clean up the text by lowering the case and removing symbols
	text = text.toLowerCase();
	text = text.replaceAll(/[^a-z0-9]/g, "");

	// Look for letters (sometimes with a number) on the front with numbers following
	const num_pattern = /[0-9]{1,6}/g;
	const word_pattern = /[a-z]{1,25}/g;

	let book = null; // The shortened book. (ie. "hel")
	let chapverse = "-1"; // A chapter-verse combination like "512" (5 : 12 or 51 : 2)

	// Check for numbers
	while (null !== (num_matcher = num_pattern.exec(text))) {
		let inumstart = num_matcher.index;
		let inumend = num_pattern.lastIndex;

		// Check for a 3nephi case
		if (inumstart == 0) {
			if (inumend == 1) {
				if (null !== (word_matcher = word_pattern.exec(text))) {
					// We got a 3nephi!
					let iwordstart = word_matcher.index;
					let iwordend = word_pattern.lastIndex;
					book = text.substring(inumstart, iwordend); // We got our book!
				} else return ""; // Dud, we got a number and no letters!
			} else return ""; // Dud, we got too many numbers in the front!
		}
		// This is the latter number, not a book number
		else {
			// Check for a hel512 case
			if (book == null) {
				if (null !== (word_matcher = word_pattern.exec(text))) {
					let iwordstart = word_matcher.index;
					let iwordend = word_pattern.lastIndex;
					book = text.substring(iwordstart, iwordend); // We got our book!
					chapverse = text.substring(inumstart, inumend); // We got our chapter + verse!

					// If there's more content then this all just became invalid
					if (null !== word_pattern.exec(text))
						return ""; // Dud, we got a hel125garbagefluff!
					else
						break; // Get outta this loop, we got everything we need.
				} else return ""; // Dud, we never found our book!
			}
			// Check for a 3ne123 case
			else {
				chapverse = text.substring(inumstart, inumend); // We got our chapter + verse!

				// If there's more content then this all just became invalid
				if (null !== word_pattern.exec(text))
					return ""; // Dud, we got a 3ne123garbagefluff!
				else
					break; // Get outta this loop, we got everything we need.
			}
		}
	}

	if (book === null || chapverse === "-1") return ""; // Somehow we got through that tangled mess without getting info
	book_list = [];
	check_for_book = true;

	// Cheap hack, convert dc or dnc to doctrineandcoveneants
	if (book === "dc" || book === "dnc") {
		book_list.push("doctrineandcovenants");
		check_for_book = false; // We already know the book now.
	}

	// Cheap hack, convert jsm to josephsmithmatthew
	if (book === "jsm") {
		book_list.push("josephsmithmatthew");
		check_for_book = false; // We already know the book now.
	}

	// Cheap hack, convert jsh to josephsmithhistory
	if (book === "jsh") {
		book_list.push("josephsmithhistory");
		check_for_book = false; // We already know the book now.
	}

	// Cheap hack, convert aof to articlesoffaith
	if (book === "aof") {
		book_list.push("articlesoffaith");
		check_for_book = false; // We already know the book now.
	}

	// Cheap hack, convert wom to wordsofmormon
	if (book === "wom") {
		book_list.push("wordsofmormon");
		check_for_book = false; // We already know the book now.
	}

	// Check if the book exists in some capacity
	if (check_for_book) {
		for (key of Object.keys(scriptures)) { // Each book as a string (ie. "helaman")
			if (key.indexOf(book) == 0) {
				book_list.push(key); // Add the book as a possible book option
			}
		}
	}

	if (book_list.length === 0) return ""; // There are no books found

	// Calculate the possible chapter-verse combinations
	// Array of pairs (ie. [ [1, 2], [3, 4], [5, 6] ])
	let chapverses = [];
	let chapter = "-1"; // -1 means empty chapter
	let verse = "-1"; // -1 means empty verse
	switch(chapverse.length) {
		case 6: // Only one combo: (123, 456)
			chapter = chapverse.substring(0, 3);
			verse = chapverse.substring(3);
			chapverses.push(new Array(chapter, verse));
			break;
		case 5: // Two combos: (12, 345); (123, 45)
			chapter = chapverse.substring(0, 2);
			verse = chapverse.substring(2);
			chapverses.push(new Array(chapter, verse));
			chapter = chapverse.substring(0, 3);
			verse = chapverse.substring(3);
			chapverses.push(new Array(chapter, verse));
			break;
		case 4: // Three combos: (1, 234); (12, 34); (123, 4)
			chapter = chapverse.substring(0, 1);
			verse = chapverse.substring(1);
			chapverses.push(new Array(chapter, verse));
			chapter = chapverse.substring(0, 2);
			verse = chapverse.substring(2);
			chapverses.push(new Array(chapter, verse));
			chapter = chapverse.substring(0, 3);
			verse = chapverse.substring(3);
			chapverses.push(new Array(chapter, verse));
			break;
		case 3: // Three combos: (12, 3); (1, 23); (123, -1)
			chapter = chapverse.substring(0, 1);
			verse = chapverse.substring(1);
			chapverses.push(new Array(chapter, verse));
			chapter = chapverse.substring(0, 2);
			verse = chapverse.substring(2);
			chapverses.push(new Array(chapter, verse));
			chapverses.push(new Array(chapverse, -1)); // Chapter with no verse
			break;
		case 2: // Two combos: (1, 2); (12, -1)
			chapter = chapverse.substring(0, 1);
			verse = chapverse.substring(1);
			chapverses.push(new Array(chapter, verse));
			// Fall through
		case 1: // Only one combo: (1, -1)
			chapverses.push(new Array(chapverse, -1)); // Chapter with no verse
			break;
		default:
			return ""; // There are no chapter-verse combos that are bigger!
	}

	// Search all of the chapter-verse combinations for each book to determine which are possible
	// In the format of [ {book, chapter, verse}, {book, chapter, verse} ]
	let possible_verses = [];
	for(b of book_list)
		for (cv of chapverses)
			// If there are enough chapters and verses in said chapter then
			if (scriptures[b].hasOwnProperty(cv[0]))
				if (scriptures[b][cv[0]].hasOwnProperty(cv[1]) || cv[1] === -1)
					possible_verses.push({"book": b, "chapter": cv[0], "verse": cv[1]}); // List the combo as possible

	// Format the text
	output = []; // This is our string builder
	for(v of possible_verses) {
		// Output the book and test for curious title cases
		output.push('<span class="bold">');
		switch(v.book) {
			case "songofsolomon":
				output.push("Song of Solomon");
				break;
			case "wordsofmormon":
				output.push("Words of Mormon");
				break;
			case "doctrineandcovenants":
				output.push("Doctrine and Covenants");
				break;
			case "josephsmithmatthew":
				output.push("Joseph Smith - Matthew");
				break;
			case "josephsmithhistory":
				output.push("Joseph Smith - History");
				break;
			case "articlesoffaith":
				output.push("Articles of Faith");
				break;
			default:
				// Output the header
				if (/\d/.test(v.book.charAt(0))) // If first character is a number
					output.push(v.book.charAt(0), ' ', v.book.substring(1, 2).toUpperCase(), v.book.substring(2)); // 1 Book:
				else
					output.push(v.book.substring(0, 1).toUpperCase(), v.book.substring(1)); // Book:
		}
		
		// Output the rest of the header
		output.push(' ', v.chapter, ":</span><br>"); // chapter\n

		// Output the verse if it is just a verse
		if (v.verse != -1)
			output.push(v.verse, ' ', scriptures[v.book][v.chapter][v.verse], "<br><br>"); // verse text\n\n
		// Output the whole chapter because it is not just a verse
		else
			for (ver in scriptures[v.book][v.chapter])
				output.push(ver, ' ', scriptures[v.book][v.chapter][ver], "<br><br>"); // verse text\n\n
	}

	// Trim the last newlines if there are any
	let returnVal = output.join("");
	if (returnVal.length >= 1)
		return returnVal.slice(0, -1);

	return returnVal;
}

// Loads all of the scriptures onto the scriptures map
function init() {
	for (let i = 0; i < FILES.length; i++) {
		// Calculate the book's name
		let iend = FILES[i].indexOf('.') + 1;
		let book = FILES[i].substring(iend).toLowerCase().replaceAll('-', '');
		
		// Set up the HTTP request
		let file = new XMLHttpRequest();
		file.open("GET", PROVIDER + FILES[i], true);
		file.onreadystatechange = () => { readFile(file, book); }
		file.send(null);
	}
}

// File is an XMLHttpRequest
function readFile(file, book) {
	if (file.readyState === 4) {  // document is ready to parse.
		if (file.status === 200) {  // file is found
			lines = file.responseText.split("\n"); // Split the text into lines
			scriptures[book] = {}; // Create a new book in the map
			let chapterIndex = "-1"; // Keeps track of the current chapter, setting to "-1" forces a new chapter be created
			for (let i = 0; i < lines.length; i++) {
				// Process the line
				let line = lines[i];
				if (line != "") {
					// Separate chapter, verse, and text. (ie. "HEL 9:39 blah blah blah..." -> (9, 39, "Blah blah blah...")
					let iend = line.indexOf(':');
					if (iend >= 4) {
						let chapter = line.substring(4, iend); // "9"
						let text = line.substring(iend + 1);   // "39 blah blah blah..."
						iend = text.indexOf(' ');
						let verse = text.substring(0, iend);   // "39"
						text = text.substring(iend + 1);	   // "blah blah blah..."

						// Check if the chapter read is different from the current chapter.
						// If it is then create a new chapter before moving on.
						if (chapter == chapterIndex) {
							scriptures[book][chapter][verse] = text;
						} else {
							// Start a new chapter
							scriptures[book][chapter] = {};
							chapterIndex = chapter;
							scriptures[book][chapter][verse] = text;
						}
					}
				}
			}

			// Update the page to reflect loading progress
			reportProgress(++progress);
		}
	}
}

// Utilizes the search function
function parseInput() {
	let text = search(document.getElementById("searchbar").value);
	
	if (text === "") {
		document.getElementById("content").style.visibility = "hidden";
	} else {
		document.getElementById("content").style.visibility = "visible";
		document.getElementById("content").innerHTML = text;
	}
}

init(); // START