var COMPARONOMIC = (function() {

    /** private variables */
    var svg = null;
    var saveimagecanvas = null;

    var margin = { right: 10, left: 10, top: 130, bottom: 10 };
    var chart = { padding: 175, width: 200, height: 300 };
    var targetID = null;
    var sliderTimer = null;
    var nextUid = 0;

    var questions = [];
    var currentQuestion = null;
    var currentQuestionIndex = 0;

    var currentLine = [];
    var otherLines = [];

    var emptyQuestion =         
    {
        title: "",
        column1: "",
        column2: "",
        comparison: 0,
        id: 0,
        uid: 0,
        comparisons: [
            { title: "", value: null, id: "c0", labelValue: null },
            { title: "", value: null, id: "c1", labelValue: null },
            { title: "", value: null, id: "c2", labelValue: null },
            { title: "", value: null, id: "c3", labelValue: null },
            { title: "", value: null, id: "c4", labelValue: null },
            { title: "", value: null, id: "c5", labelValue: null },
            { title: "", value: null, id: "c6", labelValue: null },
        ]
    };

    /** the scales that are used to map the values in the vertical columns */
    var y1 = d3
        .scaleLinear()
        .domain([0, 100])
        .range([0, chart.height])
        .clamp(true);

    var y2 = d3
        .scaleLinear()
        .domain([0, 100])
        .range([0, chart.height])
        .clamp(true);


    /**
     * Add and display a new question - see the exampleQuestion for the expected format.
     * @param {object} question 
     */
    function addNewItem(question){
        if (!question) return;
        addQuestion(question);
        init();
    }

    /**
     * Adds a question to the internal array, sets the current question to the new item.
     * Step back and forth through the questions via switchToQuestion(index)
     * @param {object} question 
     */
    function addQuestion(question){
        if (!question) return;
        question.id = questions.length + 1;
        questions.splice(0,0,question);
        currentQuestion = questions[0];
        currentQuestionIndex = 0;        
    }
    
    /**
     * Creates all the basic svg elements for the chart. There is also a canvas element
     * added to the page that will be used when saving the svg as an image.
     * Note that the 'save as image' function requires that the svg is not using external
     * style sheets, therefore there is a lot of .style(...) being used. A pita, but 
     * otherwise things that are displayed on the screen, or print output, just don't get rendered.
     */
    function buildBaseStructure() {

        currentQuestion = getCurrentQuestion();

        if (!svg){
            svg = d3
                .select("div#"+targetID)
                .append("svg")
                .attr("id","svg_comparonomic")
                .attr("viewBox", "0 0 570 500")
                .attr("background", "white")
                .attr("preserveAspectRatio", "xMidYMid meet")
                .style("background-color", "white")
                .style("font-family", "Verdana, Geneva, Tahoma, sans-serif")
                .classed("svg-content", true);
        }

        if (!saveimagecanvas){
            saveimagecanvas = document.createElement("canvas");
            saveimagecanvas.width=2280;
            saveimagecanvas.height=2000;
            /** try and add a footer to saved graph **/
            saveimagecanvas_txt = saveimagecanvas.getContext("2d");
            saveimagecanvas_txt.font = "14px Georgia";
            saveimagecanvas_txt.fillText = ("Create your own Comparonomic at comparonomic.com", 10, 50);
            
            saveimagecanvas.style.display = "none";
            saveimagecanvas.id = targetID + "saveimagecanvas";
            document.body.appendChild(saveimagecanvas);
        }

        svg.selectAll("*").remove();

        if (!canRenderCurrentQuestion()) {
            formDetailsLoad();
            return;
        }

        var titlegroup = svg
            .append("g")
            .attr("id", "titlegroup")
            .attr(
                "transform",
                "translate(" +
                    (margin.left + chart.padding + 0.5 * chart.width) +
                    ",35)"
            );

        function getLegendY(i) {
            return margin.top + 30 + i * 60;
        }

        var legendData = [];

        if (currentQuestion && currentQuestion.comparisons.some(x=>x.title !="")){
            legendData.push({ y: getLegendY(0), text: "Unbelievably better" });
            legendData.push({ y: getLegendY(1), text: "Much better" });
            legendData.push({ y: getLegendY(2), text: "Pretty much the same" });
            legendData.push({ y: getLegendY(3), text: "Much worse" });
            legendData.push({ y: getLegendY(4), text: "Horrifically worse" });
        }

        var legend = svg.append("g").attr("id", "legendgroup");

        legend
            .selectAll("line")
            .data(legendData)
            .enter()
            .append("line")
            .attr("x1", margin.left)
            .attr("y1", function(d) {
                return d.y;
            })
            .attr("x2", margin.left + chart.padding + chart.width)
            .attr("y2", function(d) {
                return d.y;
            })
            .style("stroke-width", 1.5)
            .style("stroke-dasharray", "1 2")
            .style("stroke", "black")
            .style("stroke-opacity", 0.5)
            .style("fill", "none")
            .classed("dotted", true);

        legend
            .selectAll("text")
            .data(legendData)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
            .attr("x", margin.left + 0.5 * chart.padding)
            .attr("y", function(d) {
                return d.y;
            })
            .attr("dy", "-5")
            .style("font-size", "small")
            .style("font-variant", "normal")
            .style("opacity", 0.5)
            .classed("small", true)
            .text(function(d) {
                return d.text;
            });

        var linegroup = svg
            .append("g")
            .attr("id", "linegroup")
            .attr(
                "transform",
                "translate(" +
                    (margin.left + chart.padding) +
                    "," +
                    margin.top +
                    ")"
            )
            .attr("width", chart.width)
            .attr("height", chart.height);

        var resultgroup = svg
            .append("g")
            .attr("id", "resultgroup")
            .attr(
                "transform",
                "translate(" +
                    (margin.left + chart.padding + chart.width) +
                    "," +
                    margin.top +
                    ")"
            )
            .attr("width", chart.padding)
            .attr("height", chart.height);

        var left = svg
            .append("g")
            .attr("id", "left")
            .attr("class", "slider")
            .attr(
                "transform",
                "translate(" +
                    (margin.left + chart.padding) +
                    "," +
                    margin.top +
                    ")"
            );

        var right = svg
            .append("g")
            .attr("id", "right")
            .attr("class", "slider")
            .attr(
                "transform",
                "translate(" +
                    (margin.left + chart.padding + chart.width) +
                    "," +
                    margin.top +
                    ")"
            );

        function buildSlider(g, scale, isLeft) {
            var sliderActual = 0;
            var sliderTarget = 50;
            var sliderAlpha = 0.2;
            if (!sliderTimer){
                sliderTimer = d3.timer(sliderTween);
            }

            function sliderValue(h, which) {
                sliderTarget = h;
                sliderTimer.restart(() => {
                    sliderTween();
                });
            }

            function sliderTween() {
                var sliderError = sliderTarget - sliderActual;
                if (Math.abs(sliderError) < 1e-3)
                    (sliderActual = sliderTarget), sliderTimer.stop();
                else sliderActual += sliderError * sliderAlpha;

                var cy = scale(sliderActual);

                handle.attr("transform", `translate(0,${cy})`);

                //update the line and label positions
                positionLine(g.attr("id"), cy, sliderActual);
            }

            var ox = isLeft ? 0 : 40;
            var toclass = "track-overlay " + (isLeft ? "left" : "right");
            var sw = isLeft ? "60" : "150";

            g.append("line")
                .style("stroke-linecap", "round")
                .style("stroke", "rgb(24, 21, 21)")
                .style("stroke-width", "3px")
                .style("fill", "transparent")
                .attr("class", "track")
                .attr("y1", scale.range()[0])
                .attr("y2", scale.range()[1])
                .select(function() {
                    return this.parentNode.appendChild(this.cloneNode(true));
                })
                .style("pointer-events", "all")
                .style("cursor", "crosshair")
                .style("stroke", "transparent")
                .style("fill", "transparent")
                .style("stroke-width", sw)
                .attr("class", toclass)
                .attr("transform", "translate(" + ox + ",0)")
                .call(
                    d3
                        .drag()
                        .on("start.interrupt", function() {
                            g.interrupt();

                            //pick the closest item
                            var startY = scale.invert(d3.event.y);

                            var yValue = startY;
                            if (isLeft) {
                                yValue = 100 - yValue;
                            }

                            var offset = 1000;
                            for (
                                var i = 0;
                                i < currentQuestion.comparisons.length;
                                i++
                            ) {
                                var _offset = Math.abs(
                                    yValue -
                                        currentQuestion.comparisons[i]
                                            .labelValue
                                );
                                if (_offset < offset) {
                                    offset = _offset;
                                    currentQuestion.comparison = i;
                                }
                            }

                            setupLines(currentQuestion);
                            d3.selectAll("g.handle").raise();
                            d3.selectAll("line.current")
                                .classed("active", true)
                                .raise();
                            d3.selectAll("circle.handle-circle")
                                .classed("active", true)
                                .raise();
                        })
                        .on("start", function() {
                            d3.event.sourceEvent.stopPropagation();
                            d3.event.sourceEvent.preventDefault();

                            var startY = scale.invert(d3.event.y);
                            sliderActual = startY;
                            sliderValue(startY, scale);
                        })
                        .on("drag", function() {
                            sliderValue(scale.invert(d3.event.y), scale);
                        })
                        .on("end", function() {
                            positionLabel(true);
                            d3.selectAll("line.current").classed(
                                "active",
                                false
                            );
                            d3.selectAll("circle.handle-circle").classed(
                                "active",
                                false
                            );
                        })
                );

            g.append("g").attr("class", "track-dots-group");

            var handle = g
                .insert("g", ".track-overlay")
                .attr("class", "handle");

            handle
                .append("circle")
                .attr("class", "handle-circle")
                .attr("r", 4);
        }

        buildSlider(left, y1, true);
        buildSlider(right, y2, false);
    }

    /**
     * The current question needs a certain number of fields filled in before we will draw it
     * @returns {bool} indicates if the current question is ready to render
     */
     function canRenderCurrentQuestion(){
        if (!currentQuestion) {
            return false;
        }
        if (currentQuestion.title != "" && currentQuestion.column1 != "" && currentQuestion.column2 != "" && currentQuestion.comparisons.some(x=>x.title != "")) {
            return true;
        }
        return false;
    }

    /**
     * Clone an existing object
     * @param {object} obj 
     * @returns a clone of the incoming object
     */
    function clone(obj){
        if (!obj) return null;
        return JSON.parse(JSON.stringify(obj));
    }

    function debug(){
        return;
        console.log("In Debug");
        console.log("========");
        console.log("questions");
        console.log(questions.length);
        console.log(questions);
    }

    /**
     * Helper to remove the currently display graph from the page
     */
    function deleteExistingGraph(){
        let existing = document.getElementById("svg_comparonomic");
        if (existing){
            existing.remove();
        }
        svg = null;        
    }

    /**
     * Draws and repositions the lines that represent each comparison. Also draws the little 
     * circles that are on the end of each line
     * @param {string} cls 
     * @param {object} data 
     * @param {string} color 
     */
    function drawLine(cls, data, color) {
        var lines = d3
            .select("#linegroup")
            .selectAll("line." + cls)
            .data(data);

        lines.exit().remove();

        var newlines = lines
            .enter()
            .append("line")
            .attr("stroke", color)
            .attr("stroke-width", 3)
            .classed(cls, true);

        lines
            .merge(newlines)
            .attr("stroke-opacity", function(d) {
                return d.opacity;
            })
            .attr("x1", function(d) {
                return d.x1;
            })
            .attr("y1", function(d) {
                return d.y1;
            })
            .attr("x2", function(d) {
                return d.x2;
            })
            .attr("y2", function(d) {
                return d.y2;
            })
            .style("opacity",function(d){
                return d.opacity;
            });

        function drawdots(data, isLeft, cls) {
            var track = isLeft ? "#left" : "#right";
            var clsname = "track-dot";

            var dots = d3
                .select(track)
                .select("g.track-dots-group")
                .selectAll("circle." + clsname)
                .data(data);

            dots.exit().remove();

            var newdots = dots
                .enter()
                .append("circle")
                .attr("r", "4")
                .style("fill", "black")
                .style("stroke", "black")
                .style("stroke-width", 1)
                .style("pointer-events", "none")
                .classed(clsname, true);

            dots
                .merge(newdots)
                .attr("cy", function(d) {
                    return isLeft ? d.y1 : d.y2;
                })
                .style("opacity",function(d){
                    return d.opacity;
                });
        }

        drawdots(data, true, cls);
        drawdots(data, false, cls);
    }

    /**
     * Updates the elements in the current chart (creating a chart if there is no current item)
     * @param {string} part 
     * @param {string} value 
     */
    function editChart(part,value){
        currentQuestion = getCurrentQuestion();
        if (!currentQuestion) return;
        if (currentQuestion.hasOwnProperty(part)){
            currentQuestion[part] = value;
        } else {
            let comparison = currentQuestion.comparisons.find(x=>x.id==part);
            if (comparison){
                comparison.title = value;
            }
        }

        if (canRenderCurrentQuestion()) {
            init("container",currentQuestion);
        } else {
            deleteExistingGraph();
        }

        formButtonState();
    }

    /**
     * Sends some details back to whatever html page may be rendering this chart
     */
     function formButtonState(){
        let canSave = canRenderCurrentQuestion();
        let canDelete = currentQuestion.uid > 0;
        let canNew = canDelete;
        let canSwitch = questions.length > 1;
        let updateMode = currentQuestion.uid > 0;
        
        setButtonState(canSave,canDelete,canNew,canSwitch,updateMode);
    }

    /**
     * Clears the html form fields
     */
     function formDetailsClear(){
        document.getElementById("txtTitle").value = "";
        document.getElementById("txtColumn1").value = "";
        document.getElementById("txtColumn2").value = "";
        for(let i = 1; i < 8; i++){
            document.getElementById("txtComparison"+i).value = "";
        }        
    }

    /**
     * Loads details of the current question in to the html form fields
     */
     function formDetailsLoad(){
        formDetailsClear();
        let question = COMPARONOMIC.getCurrentQuestion();
        if (!question) return;
        document.getElementById("txtTitle").value =  question.title;
        document.getElementById("txtColumn1").value = question.column1;
        document.getElementById("txtColumn2").value = question.column2;
        let txtrow = 1;
        for(let i = 0; i < question.comparisons.length; i++){
            document.getElementById("txtComparison"+txtrow).value = question.comparisons[i].title;
            txtrow++;
        }
        formButtonState();
    }

    /**
     * Gets the current question. If there isn't one, will create an empty question.
     * @returns the current question
     */
     function getCurrentQuestion(){
        if (questions.length < 1){
            if (currentQuestion) {
                return currentQuestion;
            }
            currentQuestion = clone(emptyQuestion);
            currentQuestionIndex = -1;
            return currentQuestion;
        }
        if (currentQuestionIndex < 0 || currentQuestionIndex > questions.length -1) return null;
        return questions[currentQuestionIndex];
    }

    /**
     * Get a new uid
     * @returns {number} the next uid that can be used when saving a graph
     */
    function getNextUid(){
        nextUid++;
        return nextUid;
    }

    function graphDelete(){
        if (!currentQuestion) return;
        let index = questions.findIndex(x=>x.uid == currentQuestion.uid)
        if (index > -1){
            questions.splice(index,1);
        }
        formDetailsLoad();
    }

    function graphNew(){
        if (currentQuestion && currentQuestion.uid == 0){
            let index = questions.findIndex(x=>x.uid == 0);
            questions.splice(index,1);
        }
        currentQuestion = clone(emptyQuestion);
        addNewItem(currentQuestion);
        formDetailsLoad();        
        deleteExistingGraph();
    }

    function graphSave(){
        if (!currentQuestion) return;
        if (currentQuestion.uid > 0) return;
        currentQuestion.uid = getNextUid();
        formDetailsLoad();
    }

    /**
     * Initializes the graph.
     * @param {string} target The id of the wrapper element (div) that will hold this graph
     * @param {object} question The initial question being asked. Will default to the example question
     * if this is not supplied, and there are no existing questions.
     */
    function init(target, question) {
        if (!target && !targetID) {
            return;
        }

        if (!targetID){
            targetID = target;        
        }

        if (questions.length < 1){
            addQuestion(question ? question : clone(emptyQuestion));
        }
        debug();
        buildBaseStructure();
        setupLines(currentQuestion);
        formDetailsLoad();
    }

    /**
     * Will position the labels that hang off each comparison so that they do not sit on top of
     * each other.
     * @param {bool} reflowLabels The initial pass through all of the labels will do the gross position,
     * then the reflow() function will be called to adjust positions so as not to overlap.
     */
    function positionLabel(reflowLabels) {
        var results = d3
            .select("#resultgroup")
            .selectAll("g")
            .data(currentQuestion.comparisons.filter(x => x.value !== null));

        results.exit().remove();

        var newresults = results
            .enter()
            .append("g")
            .attr("x", "20")
            .attr("dy", "5")
            .style("font-size", "small")
            .style("font-weight", "initial")
            .classed("result", true)
            .on("click", function(d, i) {
                d3.event.stopPropagation();

                var indx = currentQuestion.comparisons.indexOf(d);
                if (indx == -1) return;

                currentQuestion.comparison = indx;
                setupLines(currentQuestion);
            });

        var lineresults = results
            .enter()
            .append("line")
            .attr("x1", "4")
            .attr("x2", "20")
            .attr("y1", function(d) {
                return y2(d.value);
            })
            .attr("y2", function(d) {
                return y2(d.labelValue);
            })
            .style("stroke-width", 1.5)
            .style("stroke-dasharray", "1 2")
            .style("stroke", "black")
            .style("stroke-opacity", function(d){
                let opacity = d.title == "" ? 0 : 0.5;
                return opacity; })
            .style("fill", "none")
            .classed("dotted", true);

        newresults
            .append("rect")
            .attr("width", chart.padding)
            .attr("height", "13")
            .attr("y", "-6")
            .attr("x", "20")
            .attr("fill", "white")
            .attr("opacity", 0.75);

        newresults
            .append("text")
            .attr("x", "22")
            .attr("dy", "5");

        var current = currentQuestion.comparisons[currentQuestion.comparison];
        results
            .merge(newresults)
            .attr("transform", function(d, i) {
                return "translate(0," + y2(d.labelValue) + ")";
            })
            .attr("id", function(d) {
                return d.id;
            });

        d3.select("#resultgroup")
            .selectAll("g")
            .select("text")
            .text(function(d) {
                return d.title;
            });

        d3.select("#resultgroup")
            .selectAll("g")
            .classed("selected", function(d, i) {
                return i == currentQuestion.comparison;
            });

        d3.select("#resultgroup")
            .selectAll("line")
            .attr("y1", function(d) {
                return y2(d.value);
            })
            .attr("y2", function(d) {
                return y2(d.labelValue);
            });

        if (reflowLabels === true) {
            reflow();
            positionLabel();
        }
    }

    /**
     * Position the comparison line to reflect the dragged position
     * @param {string} id The drag may occur on the left or right vertical column
     * @param {float} cy 
     * @param {float} cyraw 
     */
    function positionLine(id, cy, cyraw) {
        var updamt;
        if (id == "left") {
            var yy2 = currentLine[0]["y2"];
            currentLine[0]["y1"] = y1(cyraw);
            currentLine[0]["y2"] = y2(100 - cyraw);
            updamt = 100 - cyraw;
            d3.select("#right")
                .select(".handle")
                .attr("transform", `translate(0,${yy2})`);
        } else {
            var yy1 = currentLine[0]["y1"];
            currentLine[0]["y1"] = y1(100 - cyraw);
            currentLine[0]["y2"] = y2(cyraw);
            updamt = cyraw;
            d3.select("#left")
                .select(".handle")
                .attr("transform", `translate(0,${yy1})`);
        }

        var myline = d3
            .select("line.current")
            .attr("x1", currentLine[0].x1)
            .attr("y1", currentLine[0].y1)
            .attr("x2", currentLine[0].x2)
            .attr("y2", currentLine[0].y2);

        var dotsleft = d3
            .select("#left")
            .select("g.track-dots-group")
            .selectAll("circle.dot")
            .attr("cy", function(d) {
                return d.y1;
            });

        var dotsright = d3
            .select("#right")
            .select("g.track-dots-group")
            .selectAll("circle.dot")
            .attr("cy", function(d) {
                return d.y2;
            });

        var indx = currentQuestion.comparison;
        currentQuestion.comparisons[indx].value = updamt;
        currentQuestion.comparisons[indx].labelValue = updamt;

        positionLabel(true);
    }

    /**
     * Updates the comparison line positions
     */
    function redrawLines() {
        drawLine("current", currentLine, "black");
        drawLine("other", otherLines, "black");
    }

    /**
     * Makes small adjustments to the calculated position of the comparison labels (so that the
     * labels don't sit on top of each other if the user has moved them close together)
     */
    function reflow() {
        var entries = currentQuestion.comparisons.filter(x => x.value !== null);
        if (entries.length < 2) return;
        entries.sort(function(a, b) {
            if (a.value == b.value) {
                return a.id - b.id;
            }
            return a.value - b.value;
        });

        var targetId =
            currentQuestion.comparisons[currentQuestion.comparison].id;
        var current = entries.find(x => x.id == targetId);
        var indx = entries.indexOf(current);

        var y = current.value;
        var offset = y2.invert(12);

        for (var i = indx - 1; i >= 0; i--) {
            var other = entries[i];
            other.labelValue = other.value;
            if (other.labelValue + offset > y) {
                other.labelValue = y - offset;
            }
            y = other.labelValue;
        }

        y = current.value + offset;
        for (var i = indx + 1; i <= entries.length - 1; i++) {
            var other = entries[i];
            other.labelValue = other.value;
            if (other.labelValue < y) {
                other.labelValue = y;
            }
            y = other.labelValue + offset;
        }
    }

    /**
     * The 'Save as image' code is from http://techslides.com/save-svg-as-an-image
     */
     function saveAsImage() {
        var html = d3
            .select("svg.svg-content")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().parentNode.innerHTML;

        var imgsrc = "data:image/svg+xml;base64," + btoa(html);
        var img = '<img src="' + imgsrc + '">';
        d3.select("#svgdataurl").html(img);

        var canvas = document.querySelector("#"+saveimagecanvas.id);
        var context = canvas.getContext("2d");

        var image = new Image();

        image.onload = function() {
            context.drawImage(image, 0, 0);

            var canvasdata = canvas.toDataURL("image/png");

            var pngimg = '<img src="' + canvasdata + '">';
            d3.select("#pngdataurl").html(pngimg);

            var a = document.createElement("a");
            a.download = "sample.png";
            a.href = canvasdata;
            document.body.appendChild(a);
            a.click();
        };
        image.src = imgsrc;
    }


    /**
     * Decorates the vertical slider column with the required title. SVG doesn't support word
     * wrapping, so will also calculate and perform a basic word wrap.
     * @param {object} g 
     * @param {object} data 
     */
    function setColumnHeading(g, data) {
        g.selectAll("text.heading").remove();
        var heading = g
            .append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(0,-35)")
            .style("font-size", "normal")
            .style("font-weight", "initial")
            .classed("heading", true);

        var columnText = data[0].heading;
        var line = [];
        var dy = 0;
        var word = null;
        var words = columnText.split(/\s+/).reverse();
        var maxwidth = 120;

        var tspan = heading
            .append("tspan")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", dy + "em")
            .style("font-weight", 500)
            .classed("columnHeader", true);

        while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > maxwidth) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                ++dy;
                tspan = heading
                    .append("tspan")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("dy", dy + "em")
                    .text(word)
                    .style("font-weight", 500)
                    .classed("columnHeader", true);
            }
        }
    }

    /**
     * Adds a title to the top of the graph. SVG doesn't support word wrapping, so will also
     * calculate and perform a basic word wrap.
     * @param {object} comparison 
     */
    function setTitle(comparison) {
        d3.select("#titlegroup")
            .selectAll("text.title")
            .remove();
        var heading = d3
            .select("#titlegroup")
            .append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(0,0)")
            .style("font-size", "larger")
            .style("font-weight", "bold")
            .classed("title", true);

        var line = [];
        var dy = 0;
        var word = null;
        var words = comparison.title.split(/\s+/).reverse();
        var maxwidth = 550;

        var tspan = heading
            .append("tspan")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", dy + "em")
            .style("font-size", "larger")
            .style("font-weight", "bold")
            .classed("title", true);

        while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > maxwidth) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                ++dy;
                tspan = heading
                    .append("tspan")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("dy", dy + "em")
                    .text(word)
                    .style("font-size", "larger")
                    .style("font-weight", "bold")
                    .classed("title", true);
            }
        }
    }

    /**
     * Earlier version of the graph had large handles superimposed over the ends of the 
     * currently dragged line. These have been reduced in size
     */
    function setupHandles() {
        if (currentLine.length !== 1) return;

        var yy1 = currentLine[0]["y1"];
        var yy2 = currentLine[0]["y2"];

        d3.select("#left")
            .select(".handle")
            .attr("transform", `translate(0,${yy1})`);

        d3.select("#right")
            .select(".handle")
            .attr("transform", `translate(0,${yy2})`);
    }

    /**
     * Sets up the lines etc for a question
     * @param {object} question 
     */
    function setupLines(question) {
        currentLine = [];
        otherLines = [];

        var requiresSetup = false;
        for(var i=0;i<question.comparisons.length;i++){
            if (!question.comparisons[i].hasOwnProperty("labelValue") || question.comparisons[i].labelValue == null){
                requiresSetup = true;
                break;
            }
        }

        var offset = y2.invert(20);
        var lineValue = 50 - (question.comparisons.length / 2) * offset;
        var currentLineIndex = requiresSetup ? 0 : question.comparison;
        if (isNaN(currentLineIndex) || currentLineIndex < 0 || currentLineIndex >= question.comparisons.length){
            currentLineIndex = 0;
        }

        for (var i = 0; i < question.comparisons.length; i++) {
            var c = question.comparisons[i];
            var lineOpacity = (c.title == "" ? 0 : 1);

            if (requiresSetup){
                c.value = lineValue;
                c.labelValue = lineValue;
            }

            var line = {
                x1: 0,
                y1: y1(100 - c.value),
                x2: chart.width,
                y2: y2(c.value),
                opacity: lineOpacity
            };
            if (currentLineIndex == i) {
                currentLine.push(line);
            } else {
                otherLines.push(line);
            }
            lineValue += offset;
        }

        setupHandles();
        redrawLines();
        positionLabel(true);
        setColumnHeading(d3.select("g#left"), [{ heading: question.column1 }]);
        setColumnHeading(d3.select("g#right"), [{ heading: question.column2 }]);
        setTitle(question);
    }

    /**
     * When the wizard creates a new item, the object representing the comparonomic is 
     * pushed into the 'questions' array. This allows the user to switch back and forth
     * through the items they have created, or select a nominated item.
     * @param {bool} moveLeft controls the direction we are heading in the questions array
     */
    function switchToNextQuestion(moveLeft){
        if (moveLeft){
            if (currentQuestionIndex == 0){
                currentQuestionIndex = questions.length -1;
            } else {
                currentQuestionIndex = Math.max(0,currentQuestionIndex - 1);
            }
        } else {
            if (currentQuestionIndex == questions.length - 1){
                currentQuestionIndex = 0;
            } else {
                currentQuestionIndex = Math.min(questions.length - 1, currentQuestionIndex + 1);
            }
        }
        switchToQuestion(currentQuestionIndex);
    }

    /**
     * When the wizard creates a new item, the object representing the comparonomic is 
     * pushed into the 'questions' array. This allows the user to switch back and forth
     * through the items they have created, or select a nominated item.
     * The 'questions' array could also be serialized out for later reloading.
     * @param {int} index 
     */
    function switchToQuestion(index){
        if (!Number.isInteger(index)) return;

        if (index >= questions.length) return;

        currentQuestion = questions[index];
        currentQuestionIndex = index;
        init();
    }

   return {
        addNewItem: addNewItem,
        debug: debug,
        editChart: editChart,
        init: init,
        formDetailsLoad: formDetailsLoad, // this will expose the private function through the public api
        graphDelete: graphDelete,
        graphNew: graphNew,
        graphSave: graphSave,
        switchToNextQuestion: switchToNextQuestion,
        switchToQuestion: switchToQuestion,
        saveAsImage:saveAsImage,
        getCurrentQuestion:getCurrentQuestion

    };

})();
