function handleClick(event){

        var title = document.getElementById("txtTitle").value;
        var column1 = document.getElementById("txtColumn1").value;
        var column2 = document.getElementById("txtColumn2").value;
        var comparisons = [];
        comparisons.push(document.getElementById("txtComparison1").value);
        comparisons.push(document.getElementById("txtComparison2").value);
        comparisons.push(document.getElementById("txtComparison3").value);
        comparisons.push(document.getElementById("txtComparison4").value);
        comparisons.push(document.getElementById("txtComparison5").value);
        comparisons.push(document.getElementById("txtComparison6").value);
        comparisons.push(document.getElementById("txtComparison7").value);

        var error = false;
        if (title.length < 1){ error = true; }
        if (column1.length < 1){ error = true; }
        if (column2.length < 1){ error = true; }

        comparisons = comparisons.filter(x => x && 0 !== x.length);
        if (comparisons.length < 1){ error = true; }

        if (error){
            return;
        }

        var question = {};
        question.title = title;
        question.column1 = column1;
        question.column2 = column2;
        question.comparison = 0;
        question.comparisons = comparisons.map(x => { 
            var c = {}; 
            c.title = x; 
            c.value = null;
            c.labelValue = null;
            return c;});

        if (question.comparisons.length > 0){
            question.comparisons[0].value = 50;
            question.comparisons[0].labelValue = 50;
        }
        COMPARONOMIC.addNewItem(question);



        return false;
}