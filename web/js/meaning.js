function createMeaningCard(meaning, voteHandler, showAddList, deleteHandler, submitHandler)
{
    const meaningCard = document.createElement('div');
    meaningCard.className = 'meaning-card';
    
    const upvoteClass = meaning.user_vote === 1 ? 'upvote-btn active' : 'upvote-btn';
    const downvoteClass = meaning.user_vote === -1 ? 'downvote-btn active' : 'downvote-btn';

    meaningCard.innerHTML = `
        <div class="meaning-header">
            <h4>${escapeHtml(meaning.name)}</h4>
            <span class="status-badge status-${meaning.approval_status.toLowerCase()}">${meaning.approval_status}</span>
        </div>
        <div class="meaning-body">
            <h3 class="meaning-expansion">${escapeHtml(meaning.short_expansion)}</h3>
            <p class="meaning-description">${escapeHtml(meaning.description)}</p>
            <div class="meaning-meta">
                <span class="meta-item">
                    <strong>Language:</strong> ${escapeHtml(meaning.lang)}
                </span>
                <span class="meta-item">
                    <strong>Domain:</strong> ${escapeHtml(meaning.domain)}
                </span>
                <span class="meta-item">
                    <strong>Submitted by:</strong> ${escapeHtml(meaning.uploader_name)}
                </span>
                <div class="meta-div">
                    <span class="meta-item">
                        <strong>Score:</strong> ${meaning.score}
                    </span>
                    <button class="vote-btn ${upvoteClass}">
                        👍 Upvote
                    </button>
                    <button class="vote-btn ${downvoteClass}">
                        👎 Downvote
                    </button>
                </div>
            </div>
        </div>
        <div class="meaning-actions">
            <button class="add-to-list-btn action-btn">
                ➕ Add to List
            </button>
            <button class="delete-btn action-btn">
                Delete
            </button>
            <button class="edit-btn action-btn">
                Edit
            </button>
        </div>
    `;

    const voteButtons = meaningCard.querySelectorAll(".vote-btn");
    if(voteHandler != null)
    {
        voteButtons[0].addEventListener("click", ev => voteHandler(ev, meaning.id, true));
        voteButtons[1].addEventListener("click", ev => voteHandler(ev, meaning.id, false));
    }
    else
    {
        voteButtons[0].remove();
        voteButtons[1].remove();
    }

    if(showAddList) meaningCard.querySelector(".add-to-list-btn").addEventListener("click", ev => showListModal(ev, meaning));
    else meaningCard.querySelector(".add-to-list-btn").remove();

    if(deleteHandler != null) meaningCard.querySelector(".delete-btn").addEventListener("click", ev => deleteHandler(ev.target, meaning.id));
    else meaningCard.querySelector(".delete-btn").remove();

    if(submitHandler != null) meaningCard.querySelector(".edit-btn").addEventListener("click", ev => openEditModal(ev, meaningCard, meaning, submitHandler));
    else meaningCard.querySelector(".edit-btn").remove();

    removeModControls(meaningCard);
    hideCardActionsIfNeeded(meaningCard);
    
    return meaningCard;
}

function setMeaningCardData(meaningCard, meaning)
{
    const upvoteClass = meaning.user_vote === 1 ? 'upvote-btn active' : 'upvote-btn';
    const downvoteClass = meaning.user_vote === -1 ? 'downvote-btn active' : 'downvote-btn';

    meaningCard.querySelector(".meaning-header > h4").textContent = escapeHtml(meaning.name);
    meaningCard.querySelector(".meaning-header > span").className = `status-badge status-${meaning.approval_status.toLowerCase()}`;
    meaningCard.querySelector(".meaning-header > span").textContent = meaning.approval_status;
    meaningCard.querySelector(".meaning-expansion").textContent = escapeHtml(meaning.short_expansion);
    meaningCard.querySelector(".meaning-description").textContent = escapeHtml(meaning.description);
    
    const metaItems = meaningCard.querySelectorAll(".meaning-meta span");
    metaItems[0].innerHTML = `<strong>Language:</strong> ${escapeHtml(meaning.lang)}`;
    metaItems[1].innerHTML = `<strong>Domain:</strong> ${escapeHtml(meaning.domain)}`;
    metaItems[2].innerHTML = `<strong>Submitted by:</strong> ${escapeHtml(meaning.uploader_name)}`;
    metaItems[3].innerHTML = `<strong>Score:</strong> ${meaning.score}`;

    const voteButtons = meaningCard.querySelectorAll(".meta-div > button");
    voteButtons[0].className = `vote-btn ${upvoteClass}`;
    voteButtons[1].className = `vote-btn ${downvoteClass}`;
}

async function removeModControls(meaningCard)
{
    const user = await GLOBAL_USER;
    if(user == null || user.current_user_role == "USER")
        meaningCard.querySelectorAll(".edit-btn, .delete-btn").forEach(btn => btn.remove());

    hideCardActionsIfNeeded(meaningCard);
}

function hideCardActionsIfNeeded(meaningCard)
{
    const actionsDiv = meaningCard.querySelector(".meaning-actions");
    if(actionsDiv.childElementCount == 0)
        actionsDiv.style.display = "none";
}

function deleteMeaning(id)
{
    return fetch(`/api/meanings?id=${id}`, {
        method: "DELETE"
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    });
}

function voteMeaning(event, meaningId, isUpvote)
{
    const meaningCard = event.target.closest('.meaning-card');
    const upvoteBtn = meaningCard.querySelector('.upvote-btn');
    const downvoteBtn = meaningCard.querySelector('.downvote-btn');

    const wasUpvoteActive = upvoteBtn.classList.contains('active');
    const wasDownvoteActive = downvoteBtn.classList.contains('active');

    const endpoint = isUpvote ? '/meanings/upvote' : '/meanings/downvote';
    return fetch(`${endpoint}?id=${meaningId}`, {
        method: 'POST'
    }).then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('You need to be logged in to vote');
            }
            throw new Error('Failed to submit vote');
        }
    }).then(() => {
        upvoteBtn.classList.remove('active');
        downvoteBtn.classList.remove('active');

        if (isUpvote) {
            if (!wasUpvoteActive) {
                upvoteBtn.classList.add('active');
            }
        } else {
            if (!wasDownvoteActive) {
                downvoteBtn.classList.add('active');
            }
        }
    });
}

function refreshMeaning(meaningCard, meaningId) {
    return fetch(`/meanings?id=${meaningId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(meaning => {
            setMeaningCardData(meaningCard, meaning);    
        })
}


function addMeaningToList(meaningId, listId) {
    return fetch(`/abbr-lists/entry?id=${listId}&meaning=${meaningId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
}

function createMeaningsGrid(meanings, handleVote, handleList, handleDelete, handleEdit)
{
    const meaningsGrid = document.createElement('div');
    meaningsGrid.className = 'meanings-grid';
    
    for(let index = 0; index < meanings.length; index++)
    {
        const meaning = meanings[index];
        const meaningCard = createMeaningCard(meaning, handleVote, handleList, handleDelete, handleEdit);
        meaningCard.style.animationDelay = `${index * 0.1}s`;
        meaningsGrid.appendChild(meaningCard);
    }

    return meaningsGrid;
}

function loadMeaningsByAbbrId(abbreviationId)
{
    return fetch(`/abbreviations?id=${abbreviationId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

function loadMeaningsByUploaderId(uploaderId)
{
        return fetch(`/api/contributions?user_id=${uploaderId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
}

function createEditModal(meaningCard, meaning, submitHandler)
{
    const modal = document.createElement("div");
    modal.id = "editModal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
        <div class="edit-modal">
            <div class="modal-header">
                <h3>Edit Meaning</h3>
                <button class="modal-close" id="closeEditModal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editForm">
                    <div class="form-group">
                        <label for="editName">Name:</label>
                        <input type="text" id="editName" name="name" required maxlength="30">
                    </div>
                    <div class="form-group">
                        <label for="editExpansion">Short Expansion:</label>
                        <textarea id="editExpansion" name="short_expansion" required maxlength="256" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="editDescription" name="description" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="editLang">Language:</label>
                        <input type="text" id="editLang" name="lang" required maxlength="3">
                    </div>
                    <div class="form-group">
                        <label for="editDomain">Domain:</label>
                        <input type="text" id="editDomain" name="domain" required maxlength="30">
                    </div>
                    <div class="form-group">
                        <label for="editStatus">Approval status:</label>
                        <select id="editStatus" name="approval_status">
                            <option value="rejected">REJECTED</option>
                            <option value="pending">PENDING</option>
                            <option value="approved">APPROVED</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" id="cancelEdit">Cancel</button>
                    </div>
                </form>
            </div>
        </div>`;

    modal.querySelector("#closeEditModal").addEventListener("click", closeEditModal);
    modal.querySelector("#cancelEdit").addEventListener("click", closeEditModal);
    modal.querySelector("#editForm").addEventListener("submit", ev => submitHandler(ev, meaningCard, meaning));

    return modal;
}

function openEditModal(ev, meaningCard, meaning, submitHandler) {
    document.body.appendChild(createEditModal(meaningCard, meaning, submitHandler));

    document.getElementById('editName').value = meaning.name;
    document.getElementById('editLang').value = meaning.lang;
    document.getElementById('editDomain').value = meaning.domain;
    document.getElementById('editExpansion').value = meaning.short_expansion;
    document.getElementById('editDescription').value = meaning.description;
    document.getElementById('editStatus').value = meaning.approval_status;
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if(modal != null)
        modal.remove();
}

function loadUserLists() {
    return fetch('/abbr-lists/mine')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Raw API response:', data);
        
        let lists = Object.values(data);
        
        console.log('Processed lists:', lists);
        return lists;
    })
    .catch(error => {
        console.error('Error loading user lists:', error);
        throw error;
    });
}

function createListItem(list)
{
    const listItem = document.createElement("div");
    listItem.className = "list-item";

    listItem.innerHTML = `
        <div class="list-item-header">
            <h4>${escapeHtml(list.name)}</h4>
            <span class="list-privacy ${list.private ? 'private' : 'public'}">
                ${list.private ? '🔒 Private' : '🌐 Public'}
            </span>
        </div>
        <div class="list-item-body">
            <p class="list-description">
                Created: ${new Date(list.created_at.date).toLocaleDateString()}
                Updated: ${new Date(list.updated_at.date).toLocaleDateString()}
            </p>
            <div class="list-stats">
                <span>${list.meanings_count || 0} meanings</span>
            </div>
        </div>
    `;

    return listItem;
}

function showListModal(ev, meaning) {
    const existingModal = document.querySelector('.list-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'list-modal';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Add "${escapeHtml(meaning.name)}" to List</h3>
            <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading your lists...</p>
            </div>
        </div>
    `;
    
    modal.querySelector(".modal-close").addEventListener("click", ev => closeListModal());
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    loadUserLists()
        .then(lists => {
            const modalBody = modal.querySelector('.modal-body');
            
            console.log('Lists in modal:', lists, 'Type:', typeof lists, 'Is Array:', Array.isArray(lists));
            
            if (!lists || !Array.isArray(lists) || lists.length === 0) {
                modalBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h4>No lists found</h4>
                        <p>You don't have any lists yet. Create one first!</p>
                        <button class="btn btn-primary">
                            Create List
                        </button>
                    </div>
                `;
                modalBody.querySelector(".btn-primary").addEventListener("click", ev => {window.location.href='my_abbreviations';});
                return;
            }
            
            try {
                const listsGrid = document.createElement("div");
                listsGrid.className = "lists-grid";

                lists.forEach(list => {
                    const listItem = createListItem(list, meaning);
                    listItem.addEventListener("click", ev => handleAddMeaningToList(meaning.id, list.id, list.name.replace(/'/g, "\\'")))
    
                    listsGrid.appendChild(listItem);
                })
                
                modalBody.innerHTML = `
                    <div class="lists-container">
                        <p>Select a list to add this meaning to:</p>
                    </div>
                `;

                modalBody.querySelector(".lists-container").appendChild(listsGrid);
            } catch (mapError) {
                console.error('Error processing lists:', mapError, lists);
                modalBody.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h4>Error processing lists</h4>
                        <p>There was an issue displaying your lists. Please try again.</p>
                        <button class="retry-btn">Retry</button>
                    </div>
                `;
                modalBody.querySelector(".retry-btn").addEventListener("click", ev => showListModal(ev, meaning));
            }
        })
        .catch(error => {
            const modalBody = modal.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h4>Failed to load lists</h4>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="retry-btn">Retry</button>
                </div>
            `;
            modalBody.querySelector(".retry-btn").addEventListener("click", ev => showListModal(ev, meaning));
        });
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeListModal();
        }
    });
}

function closeListModal(modal) {
    if(modal == null)
        modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}


function handleAddMeaningToList(meaningId, listId, listName) {
    const modalBody = document.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Adding to list...</p>
        </div>
    `;
    
    addMeaningToList(meaningId, listId)
    .then(data => {
        modalBody.innerHTML = `
            <div class="success-state">
                <div class="success-icon">✅</div>
                <h4>Success!</h4>
                <p>Meaning added to "${escapeHtml(listName)}" successfully!</p>
                <button class="btn btn-primary">Close</button>
            </div>
        `;

        modalBody.querySelector(".btn-primary").addEventListener("click", ev => closeListModal());
        
        const modal = document.querySelector('.modal-overlay');
        setTimeout(() => {
            closeListModal(modal);
        }, 2000);
    })
    .catch(error => {
        console.error('Error adding meaning to list:', error);
        modalBody.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h4>Failed to add meaning</h4>
                <p>${escapeHtml(error.message)}</p>
                <button class="retry-btn">Retry</button>
                <button class="btn btn-secondary">Cancel</button>
            </div>
        `;

        modalBody.querySelector(".retry-btn").addEventListener("click", ev => handleAddMeaningToList(meaningId, listId, listName));
        modalBody.querySelector(".btn-secondary").addEventListener("click", ev => closeListModal());
    });
}

function submitEditModal(e, meaning) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name').trim(),
        lang: formData.get('lang').trim(),
        domain: formData.get('domain').trim(),
        short_expansion: formData.get('short_expansion').trim(),
        description: formData.get('description').trim(),
        approval_status: formData.get('approval_status')
    };
    
    if (!data.name || !data.lang || !data.domain || !data.short_expansion)
        throw new Error('All fields are required');

    return fetch(`/api/meanings?id=${meaning.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        return response.json();
    });
}