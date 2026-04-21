async function showInfo(path) {
  return showInfoFor("main", path);
}

async function showInfoFor(treeId, path) {
  let parsedPath = path;
  if (typeof path === 'string') {
    try {
      parsedPath = JSON.parse(path);
    } catch(e) {
      alert("Gagal memuat info. Silakan coba lagi.");
      return;
    }
  }

  const treeData = (typeof getTreeDataById === "function") ? getTreeDataById(treeId) : currentTreeData;
  if (!treeData) {
    alert("Gagal memuat info. Silakan coba lagi.");
    return;
  }

  let node = null;
  if (!parsedPath || parsedPath.length === 0) {
    node = treeData;
  } else {
    node = getNodeByPath(treeData, parsedPath);
  }

  if (!node) {
    alert("Gagal memuat info. Silakan coba lagi.");
    return;
  }

  const info = generateFamilyInfo(treeData, parsedPath || [], node);

  let displayName = node.name;
  if (displayName && displayName.includes("|")) {
    displayName = displayName.split("|")[0].trim();
  }

  document.getElementById("info-title").innerHTML = `📋 Info: ${escapeHtml(displayName).replace(/\n/g, '<br>')}`;

  let bodyHtml = `
    <div class="info-grid">
      <div><div class="info-label">👤 Nama</div><div class="info-value">${escapeHtml(displayName).replace(/\n/g, '<br>')}</div></div>
      <div><div class="info-label">💑 Pasangan</div><div class="info-value">${info.spouse || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👶 Anak</div><div class="info-value">${info.childrenList || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👶 Cucu</div><div class="info-value">${info.grandchildrenList || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👨‍👩‍👧‍👦 Orang Tua</div><div class="info-value">${info.parents || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👴👵 Kakek/Nenek</div><div class="info-value">${info.grandparents || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👨‍👩‍👧‍👦 Saudara Kandung</div><div class="info-value">${info.siblings || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👶 Ponakan</div><div class="info-value">${info.nephews || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👨‍👩‍👧‍👦 Paman/Bibi</div><div class="info-value">${info.auntsUncles || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">👨‍👩‍👧‍👦 Sepupu</div><div class="info-value">${info.cousins || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">📜 7 Keturunan ke Atas</div><div class="info-value">${info.ancestors7 || '<span class="empty-info">- Tidak ada</span>'}</div></div>
      <div><div class="info-label">📜 7 Keturunan ke Bawah</div><div class="info-value">${info.descendants7 || '<span class="empty-info">- Tidak ada</span>'}</div></div>
    </div>
  `;

  document.getElementById("info-body").innerHTML = bodyHtml;
  document.getElementById("info-modal").style.display = "flex";
}

function generateFamilyInfo(treeData, path, node) {
  const parentPath = path.slice(0, -1);
  let parent = null;

  if (path.length === 0) {
    parent = null;
  } else if (parentPath.length === 0) {
    parent = treeData;
  } else {
    parent = getNodeByPath(treeData, parentPath);
  }

  let siblings = [];
  let currentNodeIndex = -1;

  if (parent && parent.children && path.length > 0) {
    if (parentPath.length === 0) {
      currentNodeIndex = parent.children.findIndex(c => c.name === node.name);
    } else {
      currentNodeIndex = path[path.length - 1];
    }
    if (currentNodeIndex !== -1) {
      siblings = parent.children.filter((_, idx) => idx !== currentNodeIndex);
    } else {
      siblings = parent.children.filter(c => c.name !== node.name);
    }
  }

  let nephews = [];
  siblings.forEach(sibling => {
    if (sibling.children && sibling.children.length > 0) {
      nephews = nephews.concat(sibling.children);
    }
  });

  let auntsUncles = [];
  if (parent && parentPath.length > 0) {
    let grandparent = null;
    if (parentPath.length === 1) {
      grandparent = treeData;
    } else {
      const grandparentPath = parentPath.slice(0, -1);
      grandparent = getNodeByPath(treeData, grandparentPath);
    }
    if (grandparent && grandparent.children) {
      auntsUncles = grandparent.children.filter(p => p !== parent);
    }
  }

  let cousins = [];
  auntsUncles.forEach(au => {
    if (au.children && au.children.length > 0) {
      cousins = cousins.concat(au.children);
    }
  });

  let spouse = null;
  if (node.name && node.name.includes("|")) {
    const parts = node.name.split("|");
    if (parts.length > 1 && parts[1].trim()) {
      spouse = parts[1].trim();
    }
  }

  const children = node.children || [];
  const childrenList = children.length > 0
    ? children.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;

  let grandchildren = [];
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      grandchildren = grandchildren.concat(child.children);
    }
  });
  const grandchildrenList = grandchildren.length > 0
    ? grandchildren.map((gc, i) => `${i + 1}. ${gc.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;

  const parents = parent ? parent.name.replace(/\n/g, '<br>') : null;

  let grandparent = null;
  if (parentPath.length > 0) {
    const grandparentPath = parentPath.slice(0, -1);
    let grandparentNode = null;
    if (grandparentPath.length === 0) {
      grandparentNode = treeData;
    } else {
      grandparentNode = getNodeByPath(treeData, grandparentPath);
    }
    if (grandparentNode && grandparentNode !== node && grandparentNode !== parent) {
      grandparent = grandparentNode.name.replace(/\n/g, '<br>');
    }
  }

  let ancestors = [];
  let currentParent = parent;
  let gen = 1;
  let maxGen = 7;

  while (currentParent && gen <= maxGen) {
    ancestors.push(`Generasi ke-${gen}: ${currentParent.name.replace(/\n/g, '<br>')}`);
    const currentParentPath = getPathOfNode(treeData, currentParent);
    if (currentParentPath && currentParentPath.length > 0) {
      const newParentPath = currentParentPath.slice(0, -1);
      if (newParentPath.length === 0) {
        currentParent = treeData;
        if (currentParent === treeData && ancestors.length > 0 && ancestors[ancestors.length-1].includes(treeData.name)) {
          break;
        }
      } else {
        currentParent = getNodeByPath(treeData, newParentPath);
      }
    } else {
      break;
    }
    gen++;
  }
  const ancestors7 = ancestors.length > 0 ? ancestors.join('<br>') : null;

  let descendants = [];
  let queue = [{ node: node, level: 1 }];
  while (queue.length > 0) {
    const { node: n, level } = queue.shift();
    if (level > 1 && level <= 7) {
      descendants.push(`Generasi ke-${level - 1}: ${n.name.replace(/\n/g, '<br>')}`);
    }
    if (n.children && level < 7) {
      n.children.forEach(child => queue.push({ node: child, level: level + 1 }));
    }
  }
  const descendants7 = descendants.length > 0 ? descendants.join('<br>') : null;

  return {
    spouse,
    childrenList,
    grandchildrenList,
    parents,
    grandparents: grandparent,
    ancestors7,
    siblings: siblings.length > 0 ? siblings.map((s, i) => `${i + 1}. ${s.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    nephews: nephews.length > 0 ? nephews.map((n, i) => `${i + 1}. ${n.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    auntsUncles: auntsUncles.length > 0 ? auntsUncles.map((au, i) => `${i + 1}. ${au.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    cousins: cousins.length > 0 ? cousins.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    descendants7
  };
}
/*Stable + multi-tree*/
