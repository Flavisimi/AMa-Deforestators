function createMeaningCard(meaning, voteHandler, addHandler, deleteHandler, editHandler)
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
    if(addHandler != null) meaningCard.querySelector(".add-to-list-btn").addEventListener("click", ev => addHandler(meaning.id, meaning.short_expansion));
    if(deleteHandler != null) meaningCard.querySelector(".delete-btn").addEventListener("click", ev => deleteHandler(ev.target, meaning.id));
    removeModControls(meaningCard);
    
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