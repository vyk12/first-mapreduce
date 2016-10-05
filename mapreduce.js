$(function() {
    // This constant will be used by the shuffle part to distribute equally the elements to reduce
    const NUMBER_OF_REDUCERS = 10;

    // Map function whose purpose is to extract each word of the given text
    var map = function(k, v) {
        var result = [];

        // Let's extract each word with a regular expression, non case sensitive
        var matches = v.match(/([a-záàâäãåçéèêëíìîïñóòôöõúùûüýÿœ]+)/ig);

        // Each word is read individually
        // The word will be the "key" part, and 1 will be the "value" part
        for (var i in matches) {
            result.push([matches[i], 1]);
        }

        // Return all the key/value pairs
        return result;
    };

    // Reduce function whose purpose is to add all of the values of the given key
    var reduce = function(k, v) {
        var sum = 0;

        // Each value is read and added to the final sum
        for (var i in v) {
            sum += v[i];
        }

        // The "key" part is the same as the given key, and the "value" part is the final sum
        return [k, sum];
    };

    // Sort function whose purpose is to alphabetically sort the given results list
    var sort = function(results) {
        results.sort(function(r1, r2) {
            // If the two keys are equal, return 0
            if (r1[0] == r2[0]) return 0;

            // The comparison operator on strings behaves in a human way, ie. alphabetically
            // Note that if two words start with the same letter but in a different case, the uppercase word wil be considered "lower than" the other
            // This is not a problem for us because all the text is lower cased before the process begins
            return r1[0] < r2[0] ? -1 : 1;
        });

        return results;
    };

    // Merge identical keys function whose purpose is to create a list of keys with, for each key, the list of corresponding values
    var mergeIdenticalKeys = function(results) {
        var mergedResults = [];
        var lastMergedResult = undefined;

        // Let's look into all the results to group the ones who need to be grouped
        for (var i in results) {
            var result = results[i];

            // The last element is retrieved
            if (mergedResults.length) {
                lastMergedResult = mergedResults[mergedResults.length - 1];
            }

            // If the last element has the same key than the current read result, let's add the current read result's value to the last element's values list
            if (lastMergedResult !== undefined && lastMergedResult[0] == result[0]) {
                mergedResults[mergedResults.length - 1][1].push(result[1]);
            }
            // Otherwise, the current read result's key is new, so let's add it
            else {
                mergedResults.push([result[0], [result[1]]]);
            }
        }

        return mergedResults;
    };

    // Create reducers subsets function whose purpose is to divide the results list into smaller groups, each handled by a different reducer
    var createReducersSubsets = function(results) {
        var numberOfReducersLeft = NUMBER_OF_REDUCERS;
        var numberOfResultsLeft = results.length;
        var currentResultIndex = 0;
        var numberOfPairsToGive;

        var finalResultsList = [];

        // Let's iterate over each reducer
        for (var i = 0; i < NUMBER_OF_REDUCERS; ++i) {
            // If there is only one more reducer left, let's give it all the key/value pairs left
            if (numberOfReducersLeft == 1) {
                numberOfPairsToGive = numberOfResultsLeft;
            }
            else {
                // If more than one reducer is left, the number of results to give is computed
                // by rounding up the result of the quotient of the number of results left by the number of reducers left
                numberOfPairsToGive = Math.ceil(numberOfResultsLeft / numberOfReducersLeft);
                numberOfResultsLeft -= numberOfPairsToGive;
            }

            var resultsSet = [];

            // Let's add the number of results to a subset of results, corresponding to the current reducer
            for (var j = 0; j < numberOfPairsToGive; ++j) {
                resultsSet.push(results[currentResultIndex]);
                ++currentResultIndex;
            }

            // Let's add this subset of results to the total results container
            finalResultsList.push(resultsSet);

            --numberOfReducersLeft;
        }

        return finalResultsList;
    };

    // Sort and shuffle results function whose purpose is to sort all the given results alphabetically and group the same keys together
    // Then, the results are split into subset of results, each of those subsets corresponding to a different reducer
    var sortAndShuffle = function(results) {
        // First, the results are sorted thanks to a given anonymous function
        var sortedResults = sort(results);

        // Let's now merge the identical keys
        var mergedResults = mergeIdenticalKeys(sortedResults);

        // Now that we have a sorted list with the same keys grouped, let's create subset of results for the different reducers
        var finalResults = createReducersSubsets(mergedResults);

        return finalResults;
    };

    // Process function whose purpose is to orchestrate all the algorithm
    // It will deal with the input to split it into smaller blocks
    // Then give these blocks to mappers
    // All the results of the different mappers will be sorted and then shuffled
    // Finally, the results will be given to reducers
    // All the results returned by reducers will be merged into one big results set
    // This big resuts set will be returned
    var process = function(input) {
        // Input step: explode the input into small blocks
        var lines = input.split('\n');

        // Map step
        var mapResults = [];

        for (var i in lines) {
            var mapResult = map(i, lines[i]);
            mapResults = mapResults.concat(mapResult);
        }

        // Sort and shuffle step
        var sortAndShuffleResults = sortAndShuffle(mapResults);

        // Reducer step
        var currentReducer = 1;
        var reduceResults = [];

        // The goal here is to give to the reducers the results to reduce
        // This is actually pretty dumb here because the script is run on only one thread on one machine
        // And the concept of reducers does not technically exist in the present case
        // Anyway, messages are printed in the console to verify that the words are equally handled by different "reducers"
        for (var i in sortAndShuffleResults) {
            var resultsSet = sortAndShuffleResults[i];

            // Let's print the a message with the current reducer number
            console.log("Reducer #" + currentReducer);

            // Let's look into the results set for this reducer
            for (var j in resultsSet) {
                var result = resultsSet[j];

                // Let's print the word that will be processed by the current reducer
                console.log("Handling word: " + result[0]);

                // The result is fetched from the reducer and added to the final results list
                var reduceResult = reduce(result[0], result[1]);
                reduceResults.push(reduceResult);
            }

            ++currentReducer;
        }

        // The final reduce results list is returned
        return reduceResults;
    };

    // When the process button is clicked, let's start the word counting process
    $("#process").click(function() {
        // The input is converted to lower case so that the same word in two different cases is not considered as two different words
        var wordCounts = process($("#input").val().toLowerCase());

        // Let's display the results in a beautiful table
        var output = $("#output");

        // Let's close progressively the container to update it
        output.slideUp(400, function() {
            // Let's replace all the data with a virgin table
            output.html("<table class='tablesorter'><thead><tr><th>Word</th><th>Number of times it appears</th></tr></thead><tbody></tbody></table>");
            var outputBody = output.find("tbody");

            // Every word is added to the table with its frequency
            for (var i in wordCounts) {
                outputBody.append("<tr><td>" + wordCounts[i][0] + "</td><td>" + wordCounts[i][1] + "</td></tr>");
            }

            // The container can now shows its content by slowly sliding down
            output.slideDown("slow");

            // The jQuery plugin Tbale Sorter is used so that the user can sort results alphabetically or by number of iterations
            output.find("table").tablesorter();
        });
    });
});