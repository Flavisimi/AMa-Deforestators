async function createMeaningCard(meaning, voteHandler, addHandler, deleteHandler, submitHandler)
{
    const meaningCard = document.createElement('div');
    meaningCard.className = 'meaning-card';
    
    const upvoteClass = meaning.user_vote === 1 ? 'upvote-btn active' : 'upvote-btn';
    const downvoteClass = meaning.user_vote === -1 ? 'downvote-btn active' : 'downvote-btn';

    meaningCard.innerHTML = `
        <div class="meaning-header">
            <h4>${meaning.name}</h4>
            <span class="status-badge status-${meaning.approval_status.toLowerCase()}">${meaning.approval_status}</span>
        </div>
        <div class="meaning-body">
            <h3 class="meaning-expansion">${meaning.short_expansion}</h3>
            <p class="meaning-description">${meaning.description}</p>
            <div class="meaning-meta">
                <span class="meta-item">
                    <strong>Language:</strong> ${meaning.lang}
                </span>
                <span class="meta-item">
                    <strong>Domain:</strong> ${meaning.domain}
                </span>
                <span class="meta-item">
                    <strong>Submitted by:</strong> ${meaning.uploader_name}
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

    if(addHandler != null) meaningCard.querySelector(".add-to-list-btn").addEventListener("click", ev => addHandler(meaning.id, meaning.short_expansion));
    else meaningCard.querySelector(".add-to-list-btn").remove();

    if(deleteHandler != null) meaningCard.querySelector(".delete-btn").addEventListener("click", ev => deleteHandler(ev.target, meaning.id));
    else meaningCard.querySelector(".delete-btn").remove();

    if(submitHandler != null) meaningCard.querySelector(".edit-btn").addEventListener("click", ev => openEditModal(ev, meaningCard, meaning, submitHandler));
    else meaningCard.querySelector(".edit-btn").remove();

    await removeModControls(meaningCard);
    hideCardActionsIfNeeded(meaningCard);
    
    return meaningCard;
}

function setMeaningCardData(meaningCard, meaning)
{
    const upvoteClass = meaning.user_vote === 1 ? 'upvote-btn active' : 'upvote-btn';
    const downvoteClass = meaning.user_vote === -1 ? 'downvote-btn active' : 'downvote-btn';

    meaningCard.querySelector(".meaning-header > h4").textContent = meaning.name;
    meaningCard.querySelector(".meaning-header > span").className = `status-badge status-${meaning.approval_status.toLowerCase()}`;
    meaningCard.querySelector(".meaning-header > span").textContent = meaning.approval_status;
    meaningCard.querySelector(".meaning-expansion").textContent = meaning.short_expansion;
    meaningCard.querySelector(".meaning-description").textContent = meaning.description;
    
    const metaItems = meaningCard.querySelectorAll(".meaning-meta span");
    metaItems[0].innerHTML = `<strong>Language:</strong> ${meaning.lang}`;
    metaItems[1].innerHTML = `<strong>Domain:</strong> ${meaning.domain}`;
    metaItems[2].innerHTML = `<strong>Submitted by:</strong> ${meaning.uploader_name}`;
    metaItems[3].innerHTML = `<strong>Score:</strong> ${meaning.score}`;

    const voteButtons = meaningCard.querySelectorAll(".meta-div > button");
    voteButtons[0].className = `vote-btn ${upvoteClass}`;
    voteButtons[1].className = `vote-btn ${downvoteClass}`;
}

async function removeModControls(element)
{
    const user = await GLOBAL_USER;
    if(user == null || user.current_user_role == "USER")
        element.querySelectorAll(".edit-btn, .delete-btn").forEach(btn => btn.remove());
}

async function hideCardActionsIfNeeded(meaningCard)
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
    
    meanings.forEach(async (meaning, index) => {
        let meaningCard = await createMeaningCard(meaning, handleVote, handleList, handleDelete, handleEdit);
        meaningCard.style.animationDelay = `${index * 0.1}s`;
        meaningsGrid.appendChild(meaningCard);
    });

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
                        <label for="editDescription">Description:</label>
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

async function submitEditModal(e, meaning) {
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
    
    // try {
    //     const response = await fetch(`/api/meanings?id=${editingMeaningId}`, {
    //         method: 'PUT',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify(data)
    //     });
        
    //     const result = await response.json();
        
    //     if (result.success) {
    //         showSuccess('Meaning updated successfully');
    //         closeEditModal();
    //         loadUserContributions();
    //     } else {
    //         showError(result.error || 'Failed to update meaning');
    //     }
    // } catch (error) {
    //     console.error('Error updating meaning:', error);
    //     showError('Failed to update meaning');
    // }

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