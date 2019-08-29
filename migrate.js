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
            frontMatter[result[1]] = result[2];
            content = content.substr(result[0].length + 1);
        } else if (result = content.match(/^([^: ]+) *:\s*$/m)) {
            const key = result[1]
            frontMatter[key] = [];
            content = content.substr(result[0].length + 1);
            while (result = content.match(/^ *- *([^\n]+)$/m)) {
                frontMatter[key].push(result[1]);
                content = content.substr(result[0].length + 1);
            }
        } else {
            content = content.substr(1);
        }
    }

    return frontMatter;
}

const getZolaFrontMatter = (key, value) => {
    let zola = "";
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
}

const zolaFrontMatter = (frontMatter) => {
    delete frontMatter["categories"];
    const tags = frontMatter["tags"];
    delete frontMatter["tags"];
    let zola = "+++\n";
    zola = Object.entries(frontMatter).reduce((zola, [key, value]) => {
        return zola + getZolaFrontMatter(key, value);
    }, zola);

    if (tags) {
        zola += "[taxonomies]\n";
        zola += getZolaFrontMatter("tags", tags);
    }

    zola += "+++\n";
    return zola;
}

const zolaContent = (content, dir) => {
    return content.replace(/\{%\s*asset_img\s+([^\s%]+) %}/, "![](\$1)");
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
            const dirName = file.substr(0, file.length - 3);
            return fs.readFile(source + "/" + file)
                .then(content => transform(content, dirName))
                .then(content => [dirName, content])
        }))
    })
    .then(result => {
        return Promise.all(result.map(([dirName, content]) => {
            const sourceDir = source + "/" + dirName;
            const targetDir = target + "/" + dirName;
            return fs.mkdir(targetDir).then(undefined, () => undefined)
                .then(() => fs.writeFile(targetDir + "/" + "index.md", content))
                .then(() => {
                    return fs.access(sourceDir);
                })
                .then(() => {
                    return fs.readdir(sourceDir)
                        .then(files => {
                            return Promise.all(files.map(file => fs.copyFile(sourceDir + "/" + file, targetDir + "/" + file)))
                        })
                }, () => undefined)
        }))
    })
    .catch(e => {
        console.log(e);
    })
