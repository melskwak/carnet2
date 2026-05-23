document.addEventListener('DOMContentLoaded', () => {
  const loadingScreen = document.getElementById('loading-screen');
  const bookContainer = document.getElementById('book-container');
  const bookBg = document.getElementById('book-background');
  
  const globalBookmarks = document.getElementById('global-bookmarks');
  const globeBtn = document.getElementById('globe-btn');
  const homeBtnGlobal = document.getElementById('home-btn-global');
  
  const mainBookmarks = document.getElementById('main-bookmarks');
  
  const subBookmarksContainer = document.getElementById('sub-bookmarks');
  const leftPageContent = document.getElementById('left-page-content');
  const rightPageContent = document.getElementById('right-page-content');

  const categoryConfig = [
    { id: 'Cities', name: 'Cities', icon: 'fa-city' },
    { id: 'Districts', name: 'Districts', icon: 'fa-map-location-dot' },
    { id: 'Dining', name: 'Dining', icon: 'fa-utensils' },
    { id: 'Shopping', name: 'Shopping', icon: 'fa-sack-dollar' },
    { id: 'Sightseeing', name: 'Sight-seeing', icon: 'fa-camera-retro' },
    { id: 'Climbing', name: 'Climbing', icon: 'fa-mountain-sun' }
  ];

  let appData = { destinations: [] };
  let currentMainColor = '';
  let activeDestinationId = null;
  let activeCategoryId = null;
  let cleanupColorWheel = null;
  let currentView = 'start'; 
  
  let currentBookmarkPage = 0;
  const BOOKMARKS_PER_PAGE = 6;
  
  let isCountryEditMode = false;
  let isSubEditMode = false;
  let inlineEditState = {};
  
  let hasAlertedStorage = false;
  const startMenuHTML = leftPageContent.innerHTML;

  function repairData() {
    if (!appData || !appData.destinations) return;
    appData.destinations.forEach(dest => {
      if (!dest.categories.Sightseeing) dest.categories.Sightseeing = [];
      if (typeof dest.image === 'undefined') dest.image = '';
      if (typeof dest.description === 'undefined') dest.description = '';
      
      Object.keys(dest.categories).forEach(cat => {
        dest.categories[cat].forEach(item => {
          if (typeof item.image === 'undefined') item.image = '';
          if (typeof item.description === 'undefined') item.description = '';
        });
      });
    });
  }

  function saveData() {
    try {
      localStorage.setItem('atlasData', JSON.stringify(appData));
      hasAlertedStorage = false; 
    } catch (e) {
      console.error('storage failed:', e);
      if (!hasAlertedStorage) {
        alert('storage limit reached! please use a smaller image or remove old ones.');
        hasAlertedStorage = true;
      }
    }
  }

  function loadData() {
    const savedData = localStorage.getItem('atlasData');
    if (savedData) {
      try { appData = JSON.parse(savedData); } catch(e) {}
    } else {
      const oldUniversal = localStorage.getItem('atlasDataUniversal');
      if (oldUniversal) {
        try { appData = JSON.parse(oldUniversal); } catch(e) {}
        saveData();
      }
    }

    repairData();
    renderAllBookmarks();
  }

  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('#theme-btn');
    if (themeBtn) {
      document.body.classList.toggle('dark-mode');
      themeBtn.innerHTML = document.body.classList.contains('dark-mode') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      return;
    }
    
    const importBtn = e.target.closest('#import-btn');
    if (importBtn) {
      document.getElementById('import-file').click();
      return;
    }
    
    const exportBtn = e.target.closest('#export-btn');
    if (exportBtn) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
      const downloadNode = document.createElement('a');
      downloadNode.setAttribute("href", dataStr);
      downloadNode.setAttribute("download", "atlas_data.json");
      document.body.appendChild(downloadNode);
      downloadNode.click();
      downloadNode.remove();
      return;
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'import-file') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            appData = JSON.parse(ev.target.result);
            repairData();
            saveData();
            renderAllBookmarks();
            
            if (currentView === 'countries') openCountriesView();
            else if (currentView === 'country-main' && activeDestinationId) openCountryMain(activeDestinationId);
            else if (currentView === 'sub' && activeCategoryId) populatePages(categoryConfig.find(c => c.id === activeCategoryId).name, activeCategoryId);
          } catch (err) {
            alert('invalid file format.');
          }
        };
        reader.readAsText(file);
      }
      e.target.value = '';
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    bookContainer.classList.remove('hidden');
    loadData();
  }, 1500);

  function renderAllBookmarks() {
    const existingBookmarks = document.querySelectorAll('#main-bookmarks .bookmark:not(#globe-btn):not(#home-btn-global)');
    existingBookmarks.forEach(b => b.remove());

    const referenceNode = mainBookmarks.querySelector('#globe-btn');
    
    const totalPages = Math.ceil(appData.destinations.length / BOOKMARKS_PER_PAGE);
    if (totalPages > 0 && currentBookmarkPage >= totalPages) {
      currentBookmarkPage = totalPages - 1;
    } else if (totalPages === 0) {
      currentBookmarkPage = 0;
    }

    const startIndex = currentBookmarkPage * BOOKMARKS_PER_PAGE;
    const endIndex = startIndex + BOOKMARKS_PER_PAGE;
    const paginatedDestinations = appData.destinations.slice(startIndex, endIndex);

    paginatedDestinations.forEach(dest => {
      const newBookmark = document.createElement('button');
      newBookmark.classList.add('bookmark');
      newBookmark.style.backgroundColor = dest.color;
      newBookmark.style.borderColor = '#ccc';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = dest.name;
      newBookmark.appendChild(textSpan);
      
      if (referenceNode) {
        mainBookmarks.insertBefore(newBookmark, referenceNode);
      } else {
        mainBookmarks.appendChild(newBookmark);
      }

      newBookmark.addEventListener('click', () => {
        if (activeDestinationId === dest.id && currentView === 'country-main') return;
        const isBack = newBookmark.classList.contains('left-tab');
        activeDestinationId = dest.id;
        triggerPageFlip(() => openCountryMain(dest.id), isBack);
      });
    });

    if (appData.destinations.length > BOOKMARKS_PER_PAGE) {
      const emptyCount = BOOKMARKS_PER_PAGE - paginatedDestinations.length;
      for (let i = 0; i < emptyCount; i++) {
        const emptyBtn = document.createElement('button');
        emptyBtn.classList.add('bookmark');
        emptyBtn.style.visibility = 'hidden';
        emptyBtn.style.pointerEvents = 'none';
        
        if (referenceNode) {
          mainBookmarks.insertBefore(emptyBtn, referenceNode);
        } else {
          mainBookmarks.appendChild(emptyBtn);
        }
      }

      const prevBtn = document.createElement('button');
      prevBtn.classList.add('bookmark');
      prevBtn.style.backgroundColor = '#ffffff';
      prevBtn.style.borderColor = '#ccc';
      prevBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
      prevBtn.title = "previous countries";
      if (currentBookmarkPage === 0) prevBtn.style.opacity = '0.3';
      
      const nextBtn = document.createElement('button');
      nextBtn.classList.add('bookmark');
      nextBtn.style.backgroundColor = '#ffffff';
      nextBtn.style.borderColor = '#ccc';
      nextBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      nextBtn.title = "next countries";
      if (currentBookmarkPage === totalPages - 1) nextBtn.style.opacity = '0.3';

      prevBtn.addEventListener('click', () => {
        if (currentBookmarkPage > 0) {
          currentBookmarkPage--;
          renderAllBookmarks();
        }
      });

      nextBtn.addEventListener('click', () => {
        if (currentBookmarkPage < totalPages - 1) {
          currentBookmarkPage++;
          renderAllBookmarks();
        }
      });

      if (referenceNode) {
        mainBookmarks.insertBefore(prevBtn, referenceNode);
        mainBookmarks.insertBefore(nextBtn, referenceNode);
      } else {
        mainBookmarks.appendChild(prevBtn);
        mainBookmarks.appendChild(nextBtn);
      }
    }

    if (currentView === 'country-main' || currentView === 'sub') {
      document.querySelectorAll('#main-bookmarks .bookmark').forEach(b => {
        b.classList.add('left-tab');
        b.classList.remove('selected');
      });
      if (activeDestinationId) {
        const activeDest = appData.destinations.find(d => d.id === activeDestinationId);
        if (activeDest) {
          const activeBtn = Array.from(document.querySelectorAll('#main-bookmarks .bookmark')).find(b => b.textContent === activeDest.name);
          if (activeBtn) activeBtn.classList.add('selected');
        }
      }
    }
  }

  function triggerPageFlip(contentUpdateCallback, isBack = false) {
    leftPageContent.style.opacity = '0';
    rightPageContent.style.opacity = '0';

    const gifFile = isBack ? 'reverse-book-animate.gif' : 'book-animate.gif';
    bookBg.style.backgroundImage = `url('${gifFile}?t=${new Date().getTime()}'), url('book-static.png')`;

    setTimeout(() => {
      try {
        contentUpdateCallback();
      } catch (error) {
        console.error('page flip error caught:', error);
      }
      
      bookBg.style.backgroundImage = `url('book-static.png')`;
      if (isBack) {
        bookBg.classList.remove('flip-reverse');
      }
      leftPageContent.style.opacity = '1';
      rightPageContent.style.opacity = '1';
    }, 800); 
  }

  globeBtn.addEventListener('click', () => {
    if (currentView === 'countries') return;
    if (currentView === 'start' || currentView === 'country-main' || currentView === 'sub') {
      const isBack = currentView !== 'start';
      triggerPageFlip(() => openCountriesView(), isBack);
    }
  });

  function openCountriesView() {
    currentView = 'countries';
    activeCategoryId = null;
    isCountryEditMode = false;
    isSubEditMode = false;
    
    if (cleanupColorWheel) {
      cleanupColorWheel();
      cleanupColorWheel = null;
    }

    globalBookmarks.appendChild(globeBtn);
    globalBookmarks.appendChild(homeBtnGlobal);

    globalBookmarks.classList.remove('hidden');
    globalBookmarks.classList.add('left-side');
    globeBtn.classList.add('left-tab');
    globeBtn.classList.add('selected');
    homeBtnGlobal.classList.remove('hidden');
    homeBtnGlobal.classList.add('left-tab');
    
    mainBookmarks.classList.remove('hidden');
    mainBookmarks.classList.remove('left-side');
    
    renderAllBookmarks();
    
    subBookmarksContainer.classList.add('hidden');
    
    renderCountriesList();
    renderEmptyState('fa-globe');
  }

  function renderCountriesList() {
    let listHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2 style="margin: 0;">countries</h2>
        <button id="toggle-edit-btn" class="icon-btn" title="edit list" style="font-size: 18px;">
          <i class="fa-solid ${isCountryEditMode ? 'fa-check' : 'fa-pen'}"></i>
        </button>
      </div>
      <ul id="countries-list" style="list-style: none; padding: 0;" class="${isCountryEditMode ? 'edit-mode' : ''}">`;
    
    appData.destinations.forEach((dest) => {
      if (isCountryEditMode) {
        listHtml += `
          <li class="list-item draggable" data-id="${dest.id}" draggable="true">
            <div style="display: flex; align-items: center; gap: 15px;">
              <i class="fa-solid fa-grip-vertical" style="opacity: 0.3;"></i>
              <span>${dest.name}</span>
            </div>
            <div style="display: flex; gap: 15px; font-size: 16px;">
              <i class="fa-solid fa-pen action-icon edit-country-name-btn" data-id="${dest.id}" title="rename"></i>
              <i class="fa-solid fa-trash action-icon delete-icon delete-country-btn" data-id="${dest.id}" title="delete"></i>
            </div>
          </li>`;
      } else {
        listHtml += `<li class="list-item" data-id="${dest.id}">${dest.name}</li>`;
      }
    });
    
    listHtml += `</ul>`;
    
    if (!isCountryEditMode) {
      listHtml += `<button id="add-country-btn" class="action-btn add-btn-small"><i class="fa-solid fa-plus"></i> add countries</button>`;
    }
    
    leftPageContent.innerHTML = listHtml;

    if (document.getElementById('toggle-edit-btn')) {
      document.getElementById('toggle-edit-btn').addEventListener('click', () => {
        isCountryEditMode = !isCountryEditMode;
        renderCountriesList();
      });
    }

    if (!isCountryEditMode && document.getElementById('add-country-btn')) {
      document.getElementById('add-country-btn').addEventListener('click', () => {
        const name = prompt('name your country bookmark:');
        const color = prompt('enter a background color (e.g., #ffb6c1):', '#ffb6c1');
        
        if (name && color) {
          const newDest = {
            id: Date.now().toString(),
            name: name,
            color: color,
            image: '',
            description: '',
            categories: {
              Cities: [],
              Districts: [],
              Dining: [],
              Shopping: [],
              Sightseeing: [],
              Climbing: []
            }
          };
          appData.destinations.push(newDest);
          saveData();
          renderAllBookmarks();
          renderCountriesList();
        }
      });
    }

    if (!isCountryEditMode) {
      document.querySelectorAll('.list-item[data-id]').forEach(li => {
        li.addEventListener('click', (e) => {
          const destId = e.currentTarget.getAttribute('data-id');
          if (activeDestinationId === destId && currentView === 'country-main') return;
          activeDestinationId = destId;
          triggerPageFlip(() => openCountryMain(destId));
        });
      });
    } else {
      const list = document.getElementById('countries-list');
      let draggedItem = null;

      document.querySelectorAll('.draggable').forEach(li => {
        li.addEventListener('dragstart', function(e) {
          draggedItem = this;
          setTimeout(() => this.classList.add('dragging'), 0);
        });

        li.addEventListener('dragend', function() {
          this.classList.remove('dragging');
          draggedItem = null;
          
          const newOrderIds = Array.from(list.children).map(child => child.getAttribute('data-id'));
          appData.destinations = newOrderIds.map(id => appData.destinations.find(d => d.id === id));
          saveData();
          renderAllBookmarks();
        });
      });

      list.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
          list.appendChild(draggedItem);
        } else {
          list.insertBefore(draggedItem, afterElement);
        }
      });

      document.querySelectorAll('.edit-country-name-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const dest = appData.destinations.find(d => d.id === id);
          const newName = prompt('enter new name for ‘' + dest.name + '’:', dest.name);
          if (newName && newName.trim() !== '') {
            dest.name = newName.trim();
            saveData();
            renderAllBookmarks();
            renderCountriesList();
          }
        });
      });

      document.querySelectorAll('.delete-country-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const dest = appData.destinations.find(d => d.id === id);
          if (confirm(`are you sure you want to delete ‘${dest.name}’?`)) {
            appData.destinations = appData.destinations.filter(d => d.id !== id);
            if (activeDestinationId === id) activeDestinationId = null;
            saveData();
            renderAllBookmarks();
            renderCountriesList();
            if (!activeDestinationId) renderEmptyState('fa-globe');
          }
        });
      });
    }
  }

  function renderEmptyState(iconClass) {
    rightPageContent.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid ${iconClass}"></i>
        <span>select an item or add a new one.</span>
      </div>
    `;
  }

  function goHome() {
    if (currentView === 'start') return;
    
    triggerPageFlip(() => {
      if (cleanupColorWheel) {
        cleanupColorWheel();
        cleanupColorWheel = null;
      }
      
      activeDestinationId = null;
      activeCategoryId = null;
      currentView = 'start';
      isCountryEditMode = false;
      isSubEditMode = false;
      inlineEditState = {};
      
      globalBookmarks.appendChild(globeBtn);
      globalBookmarks.appendChild(homeBtnGlobal);

      globalBookmarks.classList.remove('hidden');
      globalBookmarks.classList.remove('left-side');
      globeBtn.classList.remove('left-tab');
      globeBtn.classList.remove('selected');
      homeBtnGlobal.classList.add('hidden');
      homeBtnGlobal.classList.remove('left-tab');
      
      mainBookmarks.classList.add('hidden');
      mainBookmarks.classList.remove('left-side');
      
      renderAllBookmarks();
      
      subBookmarksContainer.classList.add('hidden');
      
      leftPageContent.innerHTML = startMenuHTML;
      rightPageContent.innerHTML = '';
      
      const currentThemeBtn = document.getElementById('theme-btn');
      if (currentThemeBtn) {
        currentThemeBtn.innerHTML = document.body.classList.contains('dark-mode') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
      }
    }, true); 
  }

  homeBtnGlobal.addEventListener('click', goHome);

  function setupImageUpload(imageArea, imageInput, item) {
    if (!imageArea || !imageInput) return;
    
    imageArea.addEventListener('click', (e) => {
      if (e.target !== imageInput) {
        imageInput.click();
      }
    });

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 800;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedImage = canvas.toDataURL('image/jpeg', 0.6);
            
            item.image = compressedImage;
            saveData();
            imageArea.style.backgroundImage = `url("${item.image}")`;
            const p = imageArea.querySelector('p');
            if (p) p.remove();
            
            if (currentView === 'country-main') openCountryMain(activeDestinationId);
            else showItemDetails(item, activeCategoryId, appData.destinations.find(d => d.id === activeDestinationId));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function setupDescriptionBox(descBox, item) {
    const resize = () => {
      descBox.style.height = 'auto'; 
      descBox.style.height = descBox.scrollHeight + 'px';
    };
    descBox.addEventListener('input', (e) => {
      item.description = e.target.value;
      saveData();
      resize();
    });
    setTimeout(resize, 10);
  }

  function openCountryMain(destinationId) {
    currentView = 'country-main';
    activeCategoryId = null;
    isCountryEditMode = false;
    isSubEditMode = false;
    inlineEditState = {};

    const destination = appData.destinations.find(d => d.id === destinationId);
    if (!destination) return;
    
    const destIndex = appData.destinations.findIndex(d => d.id === destinationId);
    if (destIndex !== -1) {
      currentBookmarkPage = Math.floor(destIndex / BOOKMARKS_PER_PAGE);
    }
    
    currentMainColor = destination.color;
    
    globalBookmarks.classList.add('hidden');
    mainBookmarks.appendChild(globeBtn);
    mainBookmarks.appendChild(homeBtnGlobal);
    mainBookmarks.classList.remove('hidden');
    mainBookmarks.classList.add('left-side');
    
    renderAllBookmarks();

    generateSubBookmarks(destination.color);
    
    leftPageContent.innerHTML = `
      <input type="text" id="bookmark-title-input" class="editable-title" value="${destination.name}">
      <div style="display: flex; align-items: center; gap: 12px; margin-top: 15px;">
        <p style="opacity: 0.7; font-size: 14px; margin: 0;">color theme:</p>
        <div id="swatch" style="width: 24px; height: 24px; border-radius: 50%; background: ${destination.color}; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.5);"></div>
        <input type="text" id="hexInput" value="${destination.color}" style="flex: 1; padding: 4px 8px; border: 1px solid rgba(92, 74, 61, 0.3); border-radius: 6px; background: transparent; font-family: inherit; color: var(--text-color); outline: none;" maxlength="7">
      </div>
      <div class="wheel-container">
        <canvas id="ringCanvas" width="240" height="240"></canvas>
        <canvas id="discCanvas" width="240" height="240"></canvas>
        <canvas id="handleCanvas" width="240" height="240" style="cursor:crosshair"></canvas>
      </div>
    `;
    
    let bgImageStyle = '';
    if (destination.image) {
      bgImageStyle = `background-image: url('${destination.image}');`;
    }

    const uploadText = destination.image ? '' : `<p><i class="fa-solid fa-camera"></i> upload picture</p>`;
    const fileInputHtml = `<input type="file" id="main-image-file" class="hidden" accept=".jpg, .jpeg, .png, .gif, .webp, .JPG, .JPEG, .PNG, image/*">`;
    const removeImgHtml = destination.image ? `<button id="remove-main-image-btn" class="remove-img-btn" title="remove picture"><i class="fa-solid fa-xmark"></i></button>` : '';

    rightPageContent.innerHTML = `
      <div class="image-upload-area" id="main-image-area" style="${bgImageStyle}">
        ${uploadText}
        ${fileInputHtml}
        ${removeImgHtml}
      </div>
      <textarea class="description-box" id="main-desc-box" placeholder="enter details about this trip here...">${destination.description}</textarea>
    `;

    document.getElementById('bookmark-title-input').addEventListener('input', (e) => {
      destination.name = e.target.value;
      saveData();
      renderAllBookmarks();
    });

    setupImageUpload(document.getElementById('main-image-area'), document.getElementById('main-image-file'), destination);
    const removeImgBtn = document.getElementById('remove-main-image-btn');
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        destination.image = '';
        saveData();
        openCountryMain(destinationId);
      });
    }

    setupDescriptionBox(document.getElementById('main-desc-box'), destination);

    if (cleanupColorWheel) {
      cleanupColorWheel();
    }
    cleanupColorWheel = initColorWheel(destination);
  }

  function generateSubBookmarks(baseColor) {
    subBookmarksContainer.innerHTML = ''; 
    subBookmarksContainer.classList.remove('hidden');

    categoryConfig.forEach((cat, index) => {
      const sub = document.createElement('button');
      sub.classList.add('sub-bookmark');
      sub.style.backgroundColor = baseColor;
      sub.style.filter = `hue-rotate(${index * 15}deg)`;
      sub.innerHTML = `<i class="fa-solid ${cat.icon}"></i>`;
      sub.title = cat.name;
      
      sub.addEventListener('click', () => {
        if (currentView === 'sub' && activeCategoryId === cat.id) return;
        isSubEditMode = false;
        triggerPageFlip(() => populatePages(cat.name, cat.id));
      });

      subBookmarksContainer.appendChild(sub);
    });
  }

  function populatePages(categoryName, categoryId, selectedIndex = null) {
    currentView = 'sub';
    activeCategoryId = categoryId;
    inlineEditState = {};
    
    const destination = appData.destinations.find(d => d.id === activeDestinationId);
    if (!destination) return;
    
    const items = destination.categories[categoryId];

    if (cleanupColorWheel) {
      cleanupColorWheel();
      cleanupColorWheel = null;
    }

    renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex);
    
    if (selectedIndex === null) {
      const cat = categoryConfig.find(c => c.id === categoryId);
      renderEmptyState(cat ? cat.icon : 'fa-list');
    }
  }

  function renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex = null) {
    let listHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2 style="margin: 0;">${categoryName}</h2>
        <button id="toggle-sub-edit-btn" class="icon-btn" title="edit list" style="font-size: 18px;">
          <i class="fa-solid ${isSubEditMode ? 'fa-check' : 'fa-pen'}"></i>
        </button>
      </div>
      <ul id="sub-items-list" style="list-style: none; padding: 0;" class="${isSubEditMode ? 'edit-mode' : ''}">`;
    
    items.forEach((item, index) => {
      if (isSubEditMode) {
        listHtml += `
          <li class="list-item draggable" data-index="${index}" draggable="true">
            <div style="display: flex; align-items: center; gap: 15px;">
              <i class="fa-solid fa-grip-vertical" style="opacity: 0.3;"></i>
              <span>${item.name}</span>
            </div>
            <div style="display: flex; gap: 15px; font-size: 16px;">
              <i class="fa-solid fa-pen action-icon edit-item-name-btn" data-index="${index}" title="rename"></i>
              <i class="fa-solid fa-trash action-icon delete-icon delete-item-btn" data-index="${index}" title="delete"></i>
            </div>
          </li>`;
      } else {
        const selClass = (index == selectedIndex) ? 'selected' : '';
        const favClass = item.favorite ? 'fa-solid' : 'fa-regular';
        const wishClass = item.wishlist ? 'fa-solid' : 'fa-regular';
        
        listHtml += `
          <li class="list-item ${selClass}" data-index="${index}">
            <span>${item.name}</span>
            <div class="item-actions">
              <i class="${favClass} fa-heart main-fav-icon" data-index="${index}"></i>
              <i class="${wishClass} fa-circle-question main-wish-icon" data-index="${index}"></i>
            </div>
          </li>`;
      }
    });
    
    if (!isSubEditMode) {
      listHtml += `</ul><button id="add-item-btn" class="action-btn add-btn-small"><i class="fa-solid fa-plus"></i> add ${categoryName}</button>`;
    } else {
      listHtml += `</ul>`;
    }
    
    leftPageContent.innerHTML = listHtml;

    if (document.getElementById('toggle-sub-edit-btn')) {
      document.getElementById('toggle-sub-edit-btn').addEventListener('click', () => {
        isSubEditMode = !isSubEditMode;
        renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex);
      });
    }

    if (!isSubEditMode && document.getElementById('add-item-btn')) {
      document.getElementById('add-item-btn').addEventListener('click', () => {
        const itemName = prompt(`enter the name of the new ${categoryName} item:`);
        if (itemName) {
          items.push({ name: itemName, description: '', image: '', favorite: false, wishlist: false, parent: null });
          saveData();
          renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex);
        }
      });
    }

    if (!isSubEditMode) {
      document.querySelectorAll('.main-fav-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-index');
          items[idx].favorite = !items[idx].favorite;
          saveData();
          renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex);
        });
      });

      document.querySelectorAll('.main-wish-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-index');
          items[idx].wishlist = !items[idx].wishlist;
          saveData();
          renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex);
        });
      });

      document.querySelectorAll('.list-item').forEach(li => {
        li.addEventListener('click', (e) => {
          if(e.target.tagName === 'I') return; 
          document.querySelectorAll('.list-item').forEach(el => el.classList.remove('selected'));
          const target = e.target.closest('.list-item');
          target.classList.add('selected');
          const index = target.getAttribute('data-index');
          showItemDetails(items[index], categoryId, destination);
        });
      });
    } else {
      const list = document.getElementById('sub-items-list');
      let draggedItem = null;

      document.querySelectorAll('.draggable').forEach(li => {
        li.addEventListener('dragstart', function(e) {
          draggedItem = this;
          setTimeout(() => this.classList.add('dragging'), 0);
        });

        li.addEventListener('dragend', function() {
          this.classList.remove('dragging');
          draggedItem = null;
          
          const newOrderIndices = Array.from(list.children).map(child => parseInt(child.getAttribute('data-index')));
          destination.categories[categoryId] = newOrderIndices.map(idx => items[idx]);
          saveData();
          renderLeftPageList(categoryName, categoryId, destination.categories[categoryId], destination, selectedIndex);
        });
      });

      list.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
          list.appendChild(draggedItem);
        } else {
          list.insertBefore(draggedItem, afterElement);
        }
      });

      document.querySelectorAll('.edit-item-name-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = e.currentTarget.getAttribute('data-index');
          const item = items[index];
          const oldName = item.name;
          const newName = prompt('enter new name for ‘' + oldName + '’:', oldName);
          if (newName && newName.trim() !== '') {
            item.name = newName.trim();
            if (categoryId === 'Cities' || categoryId === 'Districts') {
              Object.values(destination.categories).forEach(catArray => {
                catArray.forEach(child => {
                  if (child.parent === oldName) child.parent = item.name;
                });
              });
            }
            saveData();
            renderLeftPageList(categoryName, categoryId, items, destination, selectedIndex);
            if (selectedIndex == index) showItemDetails(item, categoryId, destination);
          }
        });
      });

      document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.currentTarget.getAttribute('data-index'));
          const item = items[index];
          if (confirm(`are you sure you want to delete ‘${item.name}’?`)) {
            if (categoryId === 'Cities' || categoryId === 'Districts') {
              Object.keys(destination.categories).forEach(cat => {
                destination.categories[cat] = destination.categories[cat].filter(child => child.parent !== item.name);
              });
            }
            items.splice(index, 1);
            saveData();
            renderLeftPageList(categoryName, categoryId, items, destination, null);
            renderEmptyState(categoryConfig.find(c => c.id === categoryId).icon);
          }
        });
      });
    }

    if (!isSubEditMode && selectedIndex !== null && items[selectedIndex]) {
      showItemDetails(items[selectedIndex], categoryId, destination);
    }
  }

  function showItemDetails(item, categoryId, destination) {
    if (!item) return;
    
    let extraHtml = ``;
    if (categoryId === 'Cities') {
      extraHtml = `<div class="inline-list-section" id="Districts-container"></div>`;
    } else if (categoryId === 'Districts') {
      extraHtml = `
        <div class="inline-list-section" id="Sightseeing-container"></div>
        <div class="inline-list-section" id="Dining-container"></div>
        <div class="inline-list-section" id="Shopping-container"></div>
        <div class="inline-list-section" id="Climbing-container"></div>
      `;
    }

    let bgImageStyle = '';
    if (item.image) {
      bgImageStyle = `background-image: url('${item.image}');`;
    }

    const uploadText = item.image ? '' : `<p><i class="fa-solid fa-camera"></i> upload picture</p>`;
    const fileInputHtml = `<input type="file" id="detail-image-file" class="hidden" accept=".jpg, .jpeg, .png, .gif, .webp, .JPG, .JPEG, .PNG, image/*">`;
    const removeImgHtml = item.image ? `<button id="remove-detail-image-btn" class="remove-img-btn" title="remove picture"><i class="fa-solid fa-xmark"></i></button>` : '';

    rightPageContent.innerHTML = `
      <div class="image-upload-area" id="detail-image-area" style="${bgImageStyle}">
        ${uploadText}
        ${fileInputHtml}
        ${removeImgHtml}
      </div>
      <textarea class="description-box" id="detail-desc-box" placeholder="enter details here...">${item.description}</textarea>
      ${extraHtml}
    `;

    setupImageUpload(document.getElementById('detail-image-area'), document.getElementById('detail-image-file'), item);
    const removeDetailBtn = document.getElementById('remove-detail-image-btn');
    if (removeDetailBtn) {
      removeDetailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.image = '';
        saveData();
        showItemDetails(item, categoryId, destination);
      });
    }

    setupDescriptionBox(document.getElementById('detail-desc-box'), item);

    if (categoryId === 'Cities') {
      renderInlineList(document.getElementById('Districts-container'), 'Districts', 'Districts', item.name, destination);
    } else if (categoryId === 'Districts') {
      renderInlineList(document.getElementById('Sightseeing-container'), 'Sight-seeing', 'Sightseeing', item.name, destination);
      renderInlineList(document.getElementById('Dining-container'), 'Dining', 'Dining', item.name, destination);
      renderInlineList(document.getElementById('Shopping-container'), 'Shopping', 'Shopping', item.name, destination);
      renderInlineList(document.getElementById('Climbing-container'), 'Climbing', 'Climbing', item.name, destination);
    }
  }

  function renderInlineList(container, catName, catId, parentName, destination) {
    if (!container) return;
    const allItems = destination.categories[catId];
    const isEditing = inlineEditState[catId] || false;
    
    let listHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 18px;">${catName}</h3>
        <button class="icon-btn inline-edit-toggle" data-cat="${catId}" title="edit list" style="font-size: 14px;"><i class="fa-solid ${isEditing ? 'fa-check' : 'fa-pen'}"></i></button>
      </div>
      <ul class="inline-list-ul ${isEditing ? 'edit-mode' : ''}" style="list-style: none; padding: 0;">`;
    
    allItems.forEach((child, index) => {
      if (child.parent === parentName) {
        if (isEditing) {
          listHtml += `
            <li class="list-item inline-item draggable" data-global-index="${index}" draggable="true">
              <div style="display: flex; align-items: center; gap: 15px;">
                <i class="fa-solid fa-grip-vertical" style="opacity: 0.3;"></i>
                <span>${child.name}</span>
              </div>
              <div style="display: flex; gap: 15px; font-size: 16px;">
                <i class="fa-solid fa-pen action-icon inline-edit-name-btn" data-global-index="${index}" title="rename"></i>
                <i class="fa-solid fa-trash action-icon delete-icon inline-delete-item-btn" data-global-index="${index}" title="delete"></i>
              </div>
            </li>`;
        } else {
          const favClass = child.favorite ? 'fa-solid' : 'fa-regular';
          const wishClass = child.wishlist ? 'fa-solid' : 'fa-regular';
          
          listHtml += `
            <li class="list-item inline-item" data-global-index="${index}">
              <span>${child.name}</span>
              <div class="item-actions">
                <i class="${favClass} fa-heart inline-fav-icon" data-global-index="${index}"></i>
                <i class="${wishClass} fa-circle-question inline-wish-icon" data-global-index="${index}"></i>
              </div>
            </li>`;
        }
      }
    });
    
    if (!isEditing) {
      listHtml += `</ul><button class="action-btn add-btn-small inline-add-btn"><i class="fa-solid fa-plus"></i> add ${catName}</button>`;
    } else {
      listHtml += `</ul>`;
    }
    
    container.innerHTML = listHtml;

    const toggleBtn = container.querySelector('.inline-edit-toggle');
    if (toggleBtn) {
       toggleBtn.addEventListener('click', () => {
         inlineEditState[catId] = !inlineEditState[catId];
         renderInlineList(container, catName, catId, parentName, destination);
       });
    }
    
    if (!isEditing) {
      container.querySelector('.inline-add-btn').addEventListener('click', () => {
        const name = prompt(`enter the name of the new ${catName} item:`);
        if (name) {
          allItems.push({ name: name, description: '', image: '', favorite: false, wishlist: false, parent: parentName });
          saveData();
          renderInlineList(container, catName, catId, parentName, destination);
        }
      });
      
      container.querySelectorAll('.inline-fav-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-global-index');
          allItems[idx].favorite = !allItems[idx].favorite;
          saveData();
          renderInlineList(container, catName, catId, parentName, destination);
        });
      });

      container.querySelectorAll('.inline-wish-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-global-index');
          allItems[idx].wishlist = !allItems[idx].wishlist;
          saveData();
          renderInlineList(container, catName, catId, parentName, destination);
        });
      });
      
      container.querySelectorAll('.inline-item').forEach(li => {
        li.addEventListener('click', (e) => {
          if(e.target.tagName === 'I') return;
          const index = e.currentTarget.getAttribute('data-global-index');
          triggerPageFlip(() => {
            populatePages(catName, catId, parseInt(index));
          });
        });
      });
    } else {
      const list = container.querySelector('.inline-list-ul');
      let draggedItem = null;

      container.querySelectorAll('.draggable').forEach(li => {
        li.addEventListener('dragstart', function(e) {
          draggedItem = this;
          setTimeout(() => this.classList.add('dragging'), 0);
        });

        li.addEventListener('dragend', function() {
          this.classList.remove('dragging');
          draggedItem = null;
          
          const newOrderIndices = Array.from(list.children).map(child => parseInt(child.getAttribute('data-global-index')));
          const originalIndices = [...newOrderIndices].sort((a,b)=>a-b);
          
          const newAllItems = [...allItems];
          for(let i=0; i<originalIndices.length; i++) {
             newAllItems[originalIndices[i]] = allItems[newOrderIndices[i]];
          }
          
          destination.categories[catId] = newAllItems;
          saveData();
          renderInlineList(container, catName, catId, parentName, destination);
        });
      });

      list.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
          list.appendChild(draggedItem);
        } else {
          list.insertBefore(draggedItem, afterElement);
        }
      });
      
      container.querySelectorAll('.inline-edit-name-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = e.currentTarget.getAttribute('data-global-index');
          const item = allItems[index];
          const oldName = item.name;
          const newName = prompt('enter new name for ‘' + oldName + '’:', oldName);
          if (newName && newName.trim() !== '') {
            item.name = newName.trim();
            if (catId === 'Cities' || catId === 'Districts') {
              Object.values(destination.categories).forEach(catArray => {
                catArray.forEach(child => {
                  if (child.parent === oldName) child.parent = item.name;
                });
              });
            }
            saveData();
            renderInlineList(container, catName, catId, parentName, destination);
          }
        });
      });

      container.querySelectorAll('.inline-delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.currentTarget.getAttribute('data-global-index'));
          const item = allItems[index];
          if (confirm(`are you sure you want to delete ‘${item.name}’?`)) {
            if (catId === 'Cities' || catId === 'Districts') {
              Object.keys(destination.categories).forEach(cat => {
                destination.categories[cat] = destination.categories[cat].filter(child => child.parent !== item.name);
              });
            }
            destination.categories[catId].splice(index, 1);
            saveData();
            renderInlineList(container, catName, catId, parentName, destination);
          }
        });
      });
    }
  }

  function initColorWheel(destination) {
    const SIZE = 240, cx = 120, cy = 120;
    const OUTER_R = 116, RING_W = 16, INNER_R = OUTER_R - RING_W;
    const DISC_R = INNER_R - 4;

    const rCtx = document.getElementById('ringCanvas').getContext('2d');
    const dCtx = document.getElementById('discCanvas').getContext('2d');
    const hCtx = document.getElementById('handleCanvas').getContext('2d');
    const hCanvas = document.getElementById('handleCanvas');
    
    const hexInput = document.getElementById('hexInput');
    const swatch = document.getElementById('swatch');

    let hue = 190, sat = 60, lightness = 50;
    let ringRight = true;
    let dragging = null;

    function hslToRgb(h, s, l) {
      s /= 100; l /= 100;
      const k = n => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
    }

    function rgbToHex(r,g,b){ return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
    
    function hexToRgb(hex){ return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)); }
    
    function rgbToHsl(r,g,b){
      r/=255; g/=255; b/=255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b);
      let h=0, s=0, l=(max+min)/2;
      if(max!==min){
        const d=max-min;
        s=l>0.5 ? d/(2-max-min) : d/(max+min);
        switch(max){
          case r: h=((g-b)/d+(g<b?6:0))/6; break;
          case g: h=((b-r)/d+2)/6; break;
          case b: h=((r-g)/d+4)/6; break;
        }
      }
      return [h*360, s*100, l*100];
    }

    const hex = destination.color;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const [r,g,b] = hexToRgb(hex);
      const hsl = rgbToHsl(r,g,b);
      hue = hsl[0]; sat = hsl[1]; lightness = hsl[2];
    }

    if (hexInput) {
      hexInput.addEventListener('input', e => {
        const v = e.target.value;
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
        const [r,g,b] = hexToRgb(v);
        const hsl = rgbToHsl(r,g,b);
        hue = hsl[0]; sat = hsl[1]; lightness = hsl[2];
        refresh(true);
      });
    }

    function anglToLightness(a) { return (Math.sin(a) + 1) / 2 * 100; }
    function lightnessToAngl(l) {
      const s = Math.asin((l / 50) - 1);
      return ringRight ? s : Math.PI - s;
    }

    function drawRing() {
      rCtx.clearRect(0, 0, SIZE, SIZE);
      const steps = 360;
      for (let i = 0; i < steps; i++) {
        const a0 = ((i-0.5)/steps)*Math.PI*2 - Math.PI/2;
        const a1 = ((i+0.5)/steps)*Math.PI*2 - Math.PI/2;
        const l = anglToLightness(((i/steps)*Math.PI*2) - Math.PI/2);
        const [r,g,b] = hslToRgb(hue, sat, l);
        rCtx.beginPath();
        rCtx.moveTo(cx, cy);
        rCtx.arc(cx, cy, OUTER_R, a0, a1);
        rCtx.closePath();
        rCtx.fillStyle = `rgb(${r},${g},${b})`;
        rCtx.fill();
      }
      rCtx.globalCompositeOperation = 'destination-out';
      rCtx.beginPath();
      rCtx.arc(cx, cy, INNER_R, 0, Math.PI*2);
      rCtx.fill();
      rCtx.globalCompositeOperation = 'source-over';
      for (const r of [OUTER_R, INNER_R]) {
        rCtx.beginPath();
        rCtx.arc(cx, cy, r, 0, Math.PI*2);
        rCtx.strokeStyle = 'rgba(255,255,255,0.8)';
        rCtx.lineWidth = 2;
        rCtx.stroke();
      }
    }

    function drawDisc() {
      const img = dCtx.createImageData(SIZE, SIZE);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const dx = x-cx, dy = y-cy;
          const dist = Math.sqrt(dx*dx+dy*dy);
          if (dist > DISC_R) continue;
          const h = ((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
          const s = (dist/DISC_R)*100;
          const [r,g,b] = hslToRgb(h, s, 50);
          const i=(y*SIZE+x)*4;
          img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b; img.data[i+3]=255;
        }
      }
      dCtx.putImageData(img, 0, 0);
    }

    function drawHandles() {
      hCtx.clearRect(0, 0, SIZE, SIZE);
      const dAngle = hue * Math.PI / 180;
      const dDist = (sat/100) * DISC_R;
      const dx = cx + Math.cos(dAngle)*dDist;
      const dy = cy + Math.sin(dAngle)*dDist;

      const rAngle = lightnessToAngl(lightness);
      const ringMid = (INNER_R + OUTER_R) / 2;
      const rx = cx + Math.cos(rAngle)*ringMid;
      const ry = cy + Math.sin(rAngle)*ringMid;

      hCtx.beginPath();
      hCtx.arc(rx, ry, 9, 0, Math.PI*2);
      hCtx.strokeStyle = 'white';
      hCtx.lineWidth = 2;
      hCtx.stroke();

      hCtx.beginPath();
      hCtx.arc(dx, dy, 9, 0, Math.PI*2);
      hCtx.fillStyle = 'white';
      hCtx.fill();
      hCtx.strokeStyle = 'rgba(0,0,0,0.3)';
      hCtx.stroke();
    }

    function refresh(redrawRing = true) {
      if (redrawRing) drawRing();
      drawHandles();
      const [r,g,b] = hslToRgb(hue, sat, lightness);
      const newHex = rgbToHex(r,g,b);
      
      destination.color = newHex;
      saveData();
      
      if (swatch) swatch.style.background = newHex;
      if (hexInput && document.activeElement !== hexInput) hexInput.value = newHex;
      
      const subs = document.querySelectorAll('.sub-bookmark');
      subs.forEach(sub => {
        sub.style.backgroundColor = newHex;
      });
      const mains = document.querySelectorAll('#main-bookmarks .bookmark:not(#globe-btn):not(#home-btn-global)');
      mains.forEach(main => {
        if(main.textContent === destination.name) {
            main.style.backgroundColor = newHex;
        }
      });
    }

    function getPos(e) {
      const rect = hCanvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return [src.clientX-rect.left, src.clientY-rect.top];
    }

    function pickDisc(x, y) {
      const dx=x-cx, dy=y-cy, dist=Math.sqrt(dx*dx+dy*dy);
      hue = ((Math.atan2(dy,dx)*180/Math.PI)+360)%360;
      sat = Math.min(dist/DISC_R,1)*100;
    }

    function pickRing(x, y) {
      const dx=x-cx, dy=y-cy;
      const a = Math.atan2(dy,dx);
      ringRight = dx >= 0; 
      lightness = Math.max(0, Math.min(100, anglToLightness(a)));
    }

    function onDown(e) {
      e.preventDefault();
      const [x,y] = getPos(e);
      const dist = Math.sqrt((x-cx)**2+(y-cy)**2);
      if (dist<=DISC_R) { dragging='disc'; pickDisc(x,y); refresh(true); }
      else if (dist<=OUTER_R) { dragging='ring'; pickRing(x,y); refresh(false); }
    }

    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      const [x,y] = getPos(e);
      if (dragging==='disc') { pickDisc(x,y); refresh(true); }
      else { pickRing(x,y); refresh(false); }
    }

    function onUp() { dragging = null; }

    hCanvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    
    hCanvas.addEventListener('touchstart', onDown, {passive:false});
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('touchend', onUp);

    drawDisc();
    refresh(true);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }
});