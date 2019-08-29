const path = require("path");
const fs = require("fs").promises;

const source = process.argv[2];
const target = path.join(__dirname, "content/blog");

if (!process.argv[2]) {
    process.exit(1);
}

// far from complete
const parseFrontMatter = (content) => {
    let result;
    const frontMatter = {};
    while (content.length > 0) {
        if (result = content.match(/^([^: ]+) *: *"?([^\"\n]{2,})"?$/m)) {
            // console.log(result);
            frontMatter[result[1]] = result[2];
            content = content.substr(result[0].length + 1);
        } else if (result = content.match(/^([^: ]+) *:\s*$/m)) {
            const key = result[1]
            frontMatter[key] = [];
            content = content.substr(result[0].length + 1);
            while (result = content.match(/^ *- *(\w+)/)) {
                frontMatter[key].push(result[1]);
                content = content.substr(result[0].length + 1);
            }
        } else {
            content = content.substr(1);
        }
    }

    return frontMatter;
}

const zolaFrontMatter = (frontMatter) => {
    delete frontMatter["categories"];
    let zola = "+++\n";
    zola = Object.entries(frontMatter).reduce((zola, [key, value]) => {
        zola += key + " = ";
        if (key == "date") {
            zola += value.substr(0, 10);
        } else if (Array.isArray(value)) {
            zola += "[";
            zola += value.map(JSON.stringify).join(",\n  ");
            zola += "]";
        } else {
            zola += JSON.stringify(value);
        }
        zola += "\n";

        return zola;
    }, zola);
    zola += "+++\n";
    return zola;
}

const zolaContent = (content, dir) => {
    return content.replace(/\{%\s*asset_img\s+([^\s%]+) %}/, "![](" + dir + "/\$1)");

};

const transform = (content, dir) => {
    const parts = content.toString().split("\n---\n");
    if (parts.length !== 2) {
        throw new Error("emmm " + parts.length);
    }

    const frontMatter = parseFrontMatter(parts[0]);
    return zolaFrontMatter(frontMatter) + zolaContent(parts[1], dir);
}

fs.readdir(source)
    .then(files => {
        return files.filter(file => file.endsWith(".md"));
    })
    .then(files => {
        return Promise.all(files.map(file => {
            return fs.readFile(source + "/" + file)
                .then(content => transform(content, file.substr(0, file.length - 3)))
                .then(content => [file, content])
        }))
    })
    .then(result => {
        return Promise.all(result.map(([file, content]) => fs.writeFile(target + "/" + file, content)));
        // console.log(result);
    })
