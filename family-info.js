// ========== FITUR INFO ==========
async function showInfo(path) {
  const node = getNodeByPath(currentTreeData, path);
  if (!node) return;
  
  const info = generateFamilyInfo(currentTreeData, path, node);
  
  const modal = document.getElementById("info-modal");
  const title = document.getElementById("info-title");
  const body = document.getElementById("info-body");
  
  title.innerHTML = `📋 Info: ${escapeHtml(node.name).replace(/\n/g, '<br>')}`;
  
  body.innerHTML = `
    <div class="info-grid-2col">
      <div class="info-section">
        <div class="info-label">👤 Nama</div>
        <div class="info-value">${escapeHtml(node.name).replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">💑 Pasangan</div>
        <div class="info-value">${info.spouse || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Anak</div>
        <div class="info-value">${info.childrenList || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Cucu</div>
        <div class="info-value">${info.grandchildrenList || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Orang Tua</div>
        <div class="info-value">${info.parents || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👴👵 Kakek/Nenek</div>
        <div class="info-value">${info.grandparents || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Saudara Kandung</div>
        <div class="info-value">${info.siblings || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Ponakan</div>
        <div class="info-value">${info.nephews || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Paman/Bibi</div>
        <div class="info-value">${info.auntsUncles || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Sepupu</div>
        <div class="info-value">${info.cousins || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">📜 7 Keturunan ke Atas</div>
        <div class="info-value">${info.ancestors7 || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">📜 7 Keturunan ke Bawah</div>
        <div class="info-value">${info.descendants7 || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
    </div>
  `;
  
  modal.style.display = "block";
}

function generateFamilyInfo(treeData, path, node) {
  // Cari parent (orang tua)
  const parentPath = path.slice(0, -1);
  let parent = null;
  
  if (path.length === 0) {
    parent = null;
  } else if (parentPath.length === 0) {
    parent = treeData;
  } else {
    parent = getNodeByPath(treeData, parentPath);
  }
  
  // SAUDARA KANDUNG
  let siblings = [];
  if (parent && parent.children && path.length > 0) {
    let currentNodeIndex = -1;
    if (parentPath.length === 0) {
      currentNodeIndex = parent.children.findIndex(c => c.name === node.name);
    } else {
      currentNodeIndex = path[path.length - 1];
    }
    if (currentNodeIndex !== -1) {
      siblings = parent.children.filter((_, idx) => idx !== currentNodeIndex);
    }
  }
  
  // PONAKAN
  let nephews = [];
  siblings.forEach(sibling => {
    if (sibling.children && sibling.children.length > 0) {
      nephews = nephews.concat(sibling.children);
    }
  });
  
  // PAMAN/BIBI
  let auntsUncles = [];
  if (parent) {
    let grandparent = null;
    if (parentPath.length === 0) {
      grandparent = null;
    } else if (parentPath.length === 1) {
      grandparent = treeData;
    } else {
      const grandparentPath = parentPath.slice(0, -1);
      grandparent = getNodeByPath(treeData, grandparentPath);
    }
    if (grandparent && grandparent.children) {
      auntsUncles = grandparent.children.filter(p => p !== parent);
    }
  }
  
  // SEPUPU
  let cousins = [];
  auntsUncles.forEach(au => {
    if (au.children && au.children.length > 0) {
      cousins = cousins.concat(au.children);
    }
  });
  
  // Pasangan
  let spouse = null;
  if (node.name && node.name.includes("|")) {
    const parts = node.name.split("|");
    if (parts.length > 1 && parts[1].trim()) {
      spouse = parts[1].trim();
    }
  }
  
  // Anak-anak
  const children = node.children || [];
  const childrenList = children.length > 0 
    ? children.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;
  
  // Cucu
  let grandchildren = [];
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      grandchildren = grandchildren.concat(child.children);
    }
  });
  const grandchildrenList = grandchildren.length > 0
    ? grandchildren.map((gc, i) => `${i + 1}. ${gc.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;
  
  // Orang Tua
  const parents = parent ? parent.name.replace(/\n/g, '<br>') : null;
  
  // Kakek/nenek (2 generasi ke atas)
  let grandparent = null;
  if (parentPath.length > 0) {
    const grandparentPath = parentPath.slice(0, -1);
    const grandparentNode = grandparentPath.length === 0 ? treeData : getNodeByPath(treeData, grandparentPath);
    if (grandparentNode && grandparentNode !== node && grandparentNode !== parent) {
      grandparent = grandparentNode.name.replace(/\n/g, '<br>');
    }
  }
  
  // ========== 7 KETURUNAN KE ATAS (DIPERBAIKI) ==========
  let ancestors = [];
  let currentParent = parent;
  let gen = 1;
  let maxGen = 7;
  
  while (currentParent && gen <= maxGen) {
    // Tambahkan parent ke daftar ancestors
    ancestors.push(`Generasi ke-${gen}: ${currentParent.name.replace(/\n/g, '<br>')}`);
    
    // Cari parent selanjutnya (ke atas)
    const currentParentPath = getPathOfNode(treeData, currentParent);
    
    if (currentParentPath && currentParentPath.length > 0) {
      // Parent saat ini memiliki parent
      const newParentPath = currentParentPath.slice(0, -1);
      if (newParentPath.length === 0) {
        // Parent berikutnya adalah root
        currentParent = treeData;
        // Cegah infinite loop jika root sudah ditambahkan
        if (currentParent === treeData && ancestors.length > 0 && ancestors[ancestors.length-1].includes(treeData.name)) {
          break;
        }
      } else {
        currentParent = getNodeByPath(treeData, newParentPath);
      }
    } else {
      // Tidak ada parent lagi
      break;
    }
    gen++;
  }
  
  const ancestors7 = ancestors.length > 0 ? ancestors.join('<br>') : null;
  
  // ========== 7 KETURUNAN KE BAWAH ==========
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
