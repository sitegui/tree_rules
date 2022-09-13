const rulesEl = document.getElementById('rules');
const processBtnEl = document.getElementById('process-btn');
processBtnEl.onclick = () => {
    const lines = rulesEl.value.split('\n');
    const tagNames = lines[0].split(',').slice(0, -1);
    const rules = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line) {
            const values = lines[i].split(',');
            const label = values.pop();
            const tags = new Map(tagNames.map((tag, i) => [tag, values[i]]));
            rules.push({ tags, label });
        }
    }
    const tree = buildTree(rules, new Set(tagNames));
    document.getElementById('result').innerHTML = prettyPrint(tree);
};
document.getElementById('example-btn').onclick = () => {
    fetch('example.csv').then(response => response.text()).then(data => {
        rulesEl.value = data;
        processBtnEl.click();
    });
};
function buildTree(rules, remainingTagNames) {
    // Study how good each tag cuts the rules
    const candidates = [];
    for (const tagName of remainingTagNames) {
        // Partition by a tag
        const rulesByValue = new Map();
        for (const rule of rules) {
            const value = rule.tags.get(tagName);
            if (!rulesByValue.has(value)) {
                rulesByValue.set(value, []);
            }
            rulesByValue.get(value).push(rule);
        }
        // Calculate overall diversity
        let totalDiversity = 0;
        for (const subRules of rulesByValue.values()) {
            totalDiversity += measureDiversity(subRules.map(rule => rule.label));
        }
        console.log(`Cutting by ${tagName} produces a diversity of ${totalDiversity}`);
        candidates.push({
            tagName,
            rulesByValue,
            totalDiversity,
        });
    }
    // Pick the best cut, that is, the one that reduces the most the total diversity
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].totalDiversity < best.totalDiversity) {
            best = candidates[i];
        }
    }
    // Recursively produce the children
    const children = new Map();
    for (const [value, subRules] of best.rulesByValue) {
        const firstLabel = subRules[0].label;
        if (subRules.every(rule => rule.label == firstLabel)) {
            children.set(value, firstLabel);
        }
        else {
            const subTags = new Set(remainingTagNames);
            subTags.delete(best.tagName);
            children.set(value, buildTree(subRules, subTags));
        }
    }
    return {
        tagName: best.tagName,
        children,
    };
}
function measureDiversity(labels) {
    const counters = new Map();
    for (const label of labels) {
        if (!counters.has(label)) {
            counters.set(label, 0);
        }
        counters.set(label, counters.get(label) + 1);
    }
    let diversity = 0;
    for (const counter of counters.values()) {
        const ratio = counter / labels.length;
        diversity += ratio * Math.log(1 / ratio);
    }
    return diversity;
}
function prettyPrint(tree) {
    let html = '<ul>';
    for (const [value, child] of tree.children) {
        if (typeof child == 'string') {
            html += `<li>${tree.tagName} = ${value}: ${child}</li>`;
        }
        else {
            html += `<li>${tree.tagName} = ${value}: ${prettyPrint(child)}</li>`;
        }
    }
    html += '</ul>';
    return html;
}
