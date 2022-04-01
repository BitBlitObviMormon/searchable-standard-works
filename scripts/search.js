function compareStringAsInt(a, b) {
	return parseInt(a) - parseInt(b);
}

// A map of maps of maps of strings: scriptures[book][chapter][verse]
class ScriptureList {
	// Iterates through every verse in the scriptures passing these parameters to the function: [kbook, kchapter, kverse]
	// Each parameter is a key so the verse text can be accessed as: scriptures[kbook][kchapter][kverse]
	forEachVerse(func) {
		Object.keys(this).forEach((kbook, ibook) => { // Iterate through each book
			let book = this[kbook];
			Object.keys(book).forEach((kchapter, ichapter) => { // Iterate through each chapter
				let chapter = book[kchapter];
				Object.keys(chapter).forEach((kverse, iverse) => { // Iterate through each verse
					func(kbook, kchapter, kverse);
				});
			});
		});
	}
	
	// Functions identically to forEachVerse except it takes extra time to sort it all before iterating
	forEachVerseInOrder(func) {
		Object.keys(this).sort().forEach((kbook, ibook) => { // Iterate through each book
			let book = this[kbook];
			Object.keys(book).sort(compareStringAsInt).forEach((kchapter, ichapter) => { // Iterate through each chapter
				let chapter = book[kchapter];
				Object.keys(chapter).sort(compareStringAsInt).forEach((kverse, iverse) => { // Iterate through each verse
					func(kbook, kchapter, kverse);
				});
			});
		});
	}
}

var scriptures = new ScriptureList();
const MAX_DISPLAY = 500; // The max number of search results to display without extra permission

// The file to read, hosted on my own web page.
// See: https://github.com/BitBlitObviMormon/searchable-standard-works
const PROVIDER = "https://bitblitobvimormon.github.io/searchable-standard-works/json"

// Reports the loading progress and unlocks the search bar once finished
function reportProgress(e) {
	if (e.loaded < e.total)
		document.getElementById("content").innerHTML = "Wait for a moment, loading... " + (e.loaded / e.total * 100.0).toFixed(2) + "%";
	else {
		document.getElementById("content").style.visibility = "hidden";
		document.getElementById("searchbar").disabled = false;
	}
}

// verses is a ScriptureList. It ignores the content of each verse
// and looks it up from the scriptures variable directly
function formatVerses(verses) {
	// Format the text
	var output = []; // This is our string builder
	var previousBook = "";
	var previousChapter = "";
	verses.forEachVerseInOrder((book, chapter, verse) => {
		if (book != previousBook || chapter != previousChapter) {
			previousBook = book;
			previousChapter = chapter;

			// Output the book and test for curious title cases
			output.push('<span class="bold">');
			switch(book) {
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
					if (/\d/.test(book.charAt(0))) // If first character is a number
						output.push(book.charAt(0), ' ', book.substring(1, 2).toUpperCase(), book.substring(2)); // 1 Book:
					else
						output.push(book.substring(0, 1).toUpperCase(), book.substring(1)); // Book:
			}

			// Output the rest of the header
			output.push(' ', chapter, ":</span><br>"); // chapter\n
		}

		// Output the verse if it is just a verse
		if (verse != -1)
			output.push(verse, " ", scriptures[book][chapter][verse], "<br><br>"); // verse text\n\n
		// Output the whole chapter because it is not just a verse
		else
			for (ver in scriptures[book][chapter])
				output.push(ver, " ", scriptures[book][chapter][ver], "<br><br>"); // verse text\n\n
	});

	// Trim the last newlines if there are any
	let returnVal = output.join("");
	if (returnVal.length >= 8)
		return returnVal.slice(0, -8); // Cuts out <br><br>

	return returnVal;
}

// Searches all of the scripture references using text as a parameter. Returns a formatted string.
function refLookup(text) {
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

	// Convert dc or dnc to doctrineandcoveneants
	if (book === "dc" || book === "dnc") {
		book_list.push("doctrineandcovenants");
		check_for_book = false; // We already know the book now.
	}

	// Convert jsm to josephsmithmatthew
	if (book === "jsm") {
		book_list.push("josephsmithmatthew");
		check_for_book = false; // We already know the book now.
	}

	// Convert jsh to josephsmithhistory
	if (book === "jsh") {
		book_list.push("josephsmithhistory");
		check_for_book = false; // We already know the book now.
	}

	// Convert aof or af to articlesoffaith
	if (book === "aof" || book == "af") {
		book_list.push("articlesoffaith");
		check_for_book = false; // We already know the book now.
	}

	// Convert wom or wm to wordsofmormon
	if (book === "wom" || book == "wm") {
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
		case 3: // Three combos: (1, 23); (12, 3); (123, -1)
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
	// In the same format as scriptures object minus the verse text (possible_verses[book][chapter][verse] returns "")
	let possible_verses = new ScriptureList();
	for(b of book_list) {
		for (cv of chapverses) {
			// If there are enough chapters and verses in said chapter then
			if (scriptures[b].hasOwnProperty(cv[0])) {
				if (scriptures[b][cv[0]].hasOwnProperty(cv[1]) || cv[1] === -1) { // List the combo as possible
					if (!(b in possible_verses))
						possible_verses[b] = {};

					if (!(cv[0] in possible_verses[b]))
						possible_verses[b][cv[0]] = {};

					possible_verses[b][cv[0]][cv[1]] = "";
				}
			}
		}
	}

	return formatVerses(possible_verses);
}

// Looks up a scripture reference, or if it is not formatted correctly for a reference, search for instances of the text instead.
function search(text, unsafe = false) {
	// Return early if the string is nonexistent or too small.
	if (text === null) return "";
	if (text.length < 1) return "";
	let ltext = text.toLowerCase();
	
	// If the text is a reference then return the reference
	let retVal = refLookup(text);
	if (retVal != "")
		return retVal;
	
	// If the text was not a reference then search for instances of the word
	let results = new ScriptureList();
	let resultsTotal = 0;

	// Go through each verse in the scriptures
	scriptures.forEachVerse((kbook, kchapter, kverse) => {
		let verse = scriptures[kbook][kchapter][kverse];
		
		// If the search text is found in the verse then add it to the results list
		let pos = verse.toLowerCase().indexOf(ltext);
		if (pos > -1) {
			// Add the book to the references if it has not been added yet
			if (!(kbook in results))
				results[kbook] = {};

			// Add the chapter to the references if it has not been added yet
			if (!(kchapter in results[kbook]))
				results[kbook][kchapter] = {};
			
			// Add the verse
			results[kbook][kchapter][kverse] = verse;
			resultsTotal++;
		}
	});
	
	// If there are a LOT of search results then skip formatting them altogether
	let output = []; // Our stringbuilder
	if (unsafe != true && resultsTotal > MAX_DISPLAY) {
		output.push(`Too many search results (${resultsTotal}). Display them anyway?<br>`);
		output.push("<button type=\"button\" onclick=\"parseInput(true)\">Yes, I know what I'm doing.</button>");
		return output.join("");
	}
	
	// Format the results
//	console.log(results);

	// Carefully format each instance so that it preserves its casing
	let formatted = formatVerses(results);
	let lcase = formatted.toLowerCase();
	let it = 0;   // The current iterator
	let pit = 0;  // The previous iterator
	while ((it = lcase.indexOf(ltext, it)) > -1) {
		output.push(formatted.substring(pit, it), "<span class=\"highlight\">", formatted.substring(it, it + text.length), "</span>");
		pit = it++ + text.length;
	}
	output.push(formatted.substring(pit)); // Output the last bit of text
	
	return output.join("");
}

// Loads all of the scriptures onto the scriptures map
function init() {
	// First check if the scriptures are in local storage
	const storage = localStorage.getItem("scriptures");
	if (storage !== null) {
		// Decompress the content - SLOW, only better if your internet SUCKS
		let data = LZString.decompressFromUTF16(storage);
		scriptures = Object.assign(scriptures, JSON.parse(data));
		reportProgress({loaded: 1, total: 1}) // Unlock the controls, we have finished loading.
	} else { // If the scriptures are not found in local storage then send an HTTP request
		let file = new XMLHttpRequest();
		file.open("GET", PROVIDER, true);
		file.onreadystatechange = () => { readFile(file); }
		file.addEventListener("progress", reportProgress);
		file.send(null);
	}
}

// File is an XMLHttpRequest
function readFile(file) {
	if (file.readyState === 4) {  // document is ready to parse.
		if (file.status === 200) {  // file is found
			scriptures = Object.assign(scriptures, JSON.parse(file.responseText));
			
			// Compress the data and keep it in local storage
			reportProgress({loaded: 0.9, total: 1}) // Stall the controls, we are still "loading".
			let data = LZString.compressToUTF16(file.responseText);
			localStorage.setItem("scriptures", data); // Save the content for faster loading later
			reportProgress({loaded: 1, total: 1}) // Unlock the controls, we finished loading.
		}
	}
}

// Utilizes the search function
function parseInput(unsafe = false) {
	let text = search(document.getElementById("searchbar").value, unsafe);
	
	if (text === "") {
		document.getElementById("content").style.visibility = "hidden";
	} else {
		document.getElementById("content").style.visibility = "visible";
		document.getElementById("content").innerHTML = text;
	}
}

init(); // START