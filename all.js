function renderTree() {
  console.log("renderTree dipanggil");
  const container = document.getElementById("tree");
  console.log("container #tree =", container);
  
  if (!container) {
    console.error("ERROR: Element #tree tidak ditemukan!");
    alert("ERROR: Element #tree tidak ditemukan. Periksa file index.html");
    return;
  }
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  // Jika multi-family (array dengan lebih dari 1 keluarga)
  if (Array.isArray(currentTreeData) && currentTreeData.length > 1) {
    const forestContainer = document.createElement("div");
    forestContainer.style.display = "flex";
    forestContainer.style.flexDirection = "row";
    forestContainer.style.justifyContent = "center";
    forestContainer.style.alignItems = "flex-start";
    forestContainer.style.gap = "50px";
    forestContainer.style.flexWrap = "wrap";
    forestContainer.style.padding = "20px";
    
    currentTreeData.forEach((root, idx) => {
      const treeContainer = document.createElement("div");
      treeContainer.style.display = "inline-block";
      treeContainer.style.verticalAlign = "top";
      treeContainer.style.border = "1px solid #ddd";
      treeContainer.style.borderRadius = "10px";
      treeContainer.style.padding = "10px";
      treeContainer.style.backgroundColor = "rgba(255,255,255,0.5)";
      
      const title = document.createElement("div");
      title.style.textAlign = "center";
      title.style.fontWeight = "bold";
      title.style.marginBottom = "10px";
      title.style.padding = "5px";
      title.style.backgroundColor = "#f0f0f0";
      title.style.borderRadius = "5px";
      let displayName = root.name;
      if (displayName && displayName.includes("|")) displayName = displayName.split("|")[0].trim();
      title.innerText = displayName;
      treeContainer.appendChild(title);
      
      const tempDiv = document.createElement("div");
      tempDiv.id = `temp-tree-${idx}`;
      treeContainer.appendChild(tempDiv);
      
      forestContainer.appendChild(treeContainer);
      
      new Treant({
        chart: {
          container: `#temp-tree-${idx}`,
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 12,
          siblingSeparation: 8,
          subTeeSeparation: 8
        },
        nodeStructure: convert(root, [idx], 1)
      });
    });
    
    container.appendChild(forestContainer);
  } 
  // Single family
  else {
    const singleRoot = Array.isArray(currentTreeData) ? currentTreeData[0] : currentTreeData;
    if (singleRoot) {
      new Treant({
        chart: {
          container: "#tree",
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 12,
          siblingSeparation: 8,
          subTeeSeparation: 8
        },
        nodeStructure: convert(singleRoot, [], 1)
      });
    }
  }
  
  setTimeout(() => {
    if (wrapper) {
      if (isFirstLoad) {
        wrapper.scrollLeft = 800;
        wrapper.scrollTop = 400;
        isFirstLoad = false;
      } else {
        wrapper.scrollLeft = savedLeft;
        wrapper.scrollTop = savedTop;
      }
    }
  }, 100);
}
