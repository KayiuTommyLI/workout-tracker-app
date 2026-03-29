import { getEquipment, getUserEquipment, updateUserEquipment } from './sheetsAPI.js';

let currentUserId = null;

// Initialize equipment manager
export async function initializeEquipmentManager(userId) {
    currentUserId = userId;
    
    const container = document.getElementById('equipment-container');
    if (!container) {
        console.error('Equipment container not found');
        return;
    }
    
    container.innerHTML = `
        <div class="equipment-manager">
            <div class="section-header">
                <h3>🏋️ My Gym Equipment</h3>
                <div style="display: flex; gap: 10px;">
                    <button id="refresh-equipment-btn" class="btn-small" title="Refresh">🔄</button>
                    <button id="edit-equipment-btn" class="btn-small">Edit Equipment</button>
                </div>
            </div>
            <div id="equipment-display" class="equipment-display-loading">
                <p>Loading equipment...</p>
            </div>
        </div>
    `;
    
    await displayUserEquipment(userId);
    
    document.getElementById('edit-equipment-btn').addEventListener('click', () => {
        showEquipmentModal(userId);
    });
    
    document.getElementById('refresh-equipment-btn').addEventListener('click', async () => {
        await displayUserEquipment(userId);
        showToast('🔄 Equipment refreshed');
    });
}

// Display user's current equipment
async function displayUserEquipment(userId) {
    const display = document.getElementById('equipment-display');
    if (!display) return;
    
    try {
        display.className = 'equipment-display-loading';
        display.innerHTML = '<p>Loading equipment...</p>';
        
        console.log('Displaying equipment for user:', userId);
        const userEquipment = await getUserEquipment(userId);
        console.log('User equipment retrieved:', userEquipment);
        
        display.className = '';
        
        if (userEquipment.length === 0) {
            display.innerHTML = `
                <p class="no-equipment">No equipment selected. Click "Edit Equipment" to set up your gym.</p>
            `;
            return;
        }
        
        const equipmentList = document.createElement('div');
        equipmentList.className = 'equipment-list';
        equipmentList.innerHTML = userEquipment.map(eq => `
            <div class="equipment-badge">
                <span class="equipment-icon">✓</span>
                <span class="equipment-name">${eq.equipmentName}</span>
            </div>
        `).join('');
        
        display.innerHTML = '';
        display.appendChild(equipmentList);
    } catch (error) {
        console.error('Error displaying equipment:', error);
        display.className = '';
        display.innerHTML = '<p class="error">Failed to load equipment. <button onclick="location.reload()">Reload Page</button></p>';
    }
}

// Show equipment selection modal
async function showEquipmentModal(userId) {
    try {
        const allEquipment = await getEquipment();
        const userEquipment = await getUserEquipment(userId);
        const selectedIds = userEquipment.map(eq => eq.equipmentId);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'equipment-modal';
        modal.innerHTML = `
            <div class="modal-content equipment-modal">
                <h3>Select Your Gym Equipment</h3>
                <p class="modal-description">Check all equipment available at your gym:</p>
                <form id="equipment-form">
                    <div class="equipment-grid">
                        ${allEquipment.map(eq => `
                            <label class="equipment-checkbox">
                                <input 
                                    type="checkbox" 
                                    name="equipment" 
                                    value="${eq.equipmentId}"
                                    ${selectedIds.includes(eq.equipmentId) ? 'checked' : ''}
                                >
                                <div class="checkbox-content">
                                    <span class="equipment-title">${eq.equipmentName}</span>
                                    <span class="equipment-category">${eq.category}</span>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary" id="save-equipment-btn">
                            💾 Save Equipment
                        </button>
                        <button type="button" class="btn-secondary" id="cancel-equipment-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('equipment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const saveBtn = document.getElementById('save-equipment-btn');
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = '💾 Saving...';
            
            try {
                const formData = new FormData(e.target);
                const selectedEquipment = formData.getAll('equipment');
                
                console.log('Saving equipment:', selectedEquipment);
                
                await updateUserEquipment(userId, selectedEquipment);
                
                console.log('Equipment saved successfully');
                
                // Reload equipment display immediately
                await displayUserEquipment(userId);
                
                // Close modal
                document.body.removeChild(modal);
                
                // Show success message
                showToast('✅ Equipment updated successfully!');
            } catch (error) {
                console.error('Error updating equipment:', error);
                alert('Failed to update equipment. Please make sure you are signed in.');
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        });
        
        // Handle cancel
        document.getElementById('cancel-equipment-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    } catch (error) {
        console.error('Error showing equipment modal:', error);
        alert('Failed to load equipment. Please try again.');
    }
}

// Show toast notification
function showToast(message) {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Refresh equipment display (can be called from outside)
export async function refreshEquipmentDisplay() {
    if (currentUserId) {
        await displayUserEquipment(currentUserId);
    }
}

export default {
    initializeEquipmentManager,
    refreshEquipmentDisplay,
};