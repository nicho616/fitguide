// FitGuide Core Application Logic

// 1. 语言翻译字典
const TRANSLATIONS = {
    // Body Parts
    'back': '背部',
    'cardio': '有氧',
    'chest': '胸部',
    'lower arms': '前臂',
    'lower legs': '小腿',
    'neck': '颈部',
    'shoulders': '肩部',
    'upper arms': '上臂',
    'upper legs': '大腿',
    'waist': '腰部',
    // Targets
    'abductors': '髋外展肌',
    'abs': '腹肌',
    'adductors': '髋内收肌',
    'biceps': '肱二头肌',
    'calves': '小腿肌群',
    'cardiovascular system': '心血管系统',
    'delts': '三角肌',
    'forearms': '前臂肌群',
    'glutes': '臀肌',
    'hamstrings': '股二头肌(大腿后侧)',
    'lats': '背阔肌',
    'levator scapulae': '肩胛提肌',
    'pectorals': '胸肌',
    'quads': '股四头肌(大腿前侧)',
    'serratus anterior': '前锯肌',
    'spine': '脊柱',
    'traps': '斜方肌',
    'triceps': '肱三头肌',
    'upper back': '上背部',
    // Equipment
    'assisted': '辅助器械',
    'band': '弹力带',
    'barbell': '杠铃',
    'body weight': '自重',
    'bosu ball': '波速球',
    'cable': '绳索',
    'dumbbell': '哑铃',
    'elliptical machine': '椭圆机',
    'ez barbell': '曲柄杠铃(EZ)',
    'hammer': '悍马架',
    'kettlebell': '壶铃',
    'leverage machine': '杠杆器械',
    'medicine ball': '药球',
    'olympic barbell': '奥林匹克杠铃',
    'resistance band': '阻力带',
    'roller': '滚轮',
    'rope': '绳索',
    'skierg machine': '滑雪器',
    'sled machine': '雪橇架',
    'smith machine': '史密斯机',
    'stability ball': '瑜伽球',
    'stationary bike': '动感单车',
    'stepmill machine': '登山机',
    'tire': '轮胎',
    'trap bar': '六角杠',
    'upper body ergometer': '手摇自行车',
    'weighted': '负重',
    'wheel roller': '健腹轮'
};

const BASE_MEDIA_URL = 'https://jsd.onmicrosoft.cn/gh/hasaneyldrm/exercises-dataset@main/';

// 2. 全局状态
let allExercises = [];
let filteredExercises = [];
let plan = [];
let visibleCount = 20;
let observer = null;

// 3. DOM 元素
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const togglePlanBtn = document.getElementById('toggle-plan-btn');
const planBadge = document.getElementById('plan-badge');

const bodyPartsGroup = document.getElementById('body-parts-group');
const targetsGroup = document.getElementById('targets-group');
const equipmentsGroup = document.getElementById('equipments-group');

const exercisesGrid = document.getElementById('exercises-grid');
const totalCountSpan = document.getElementById('total-count');
const mobileFilterTrigger = document.getElementById('mobile-filter-trigger');
const closeFilterBtn = document.getElementById('close-filter-btn');
const filterSidebar = document.getElementById('filter-sidebar');

const planOverlay = document.getElementById('plan-overlay');
const planDrawer = document.getElementById('plan-drawer');
const closePlanBtn = document.getElementById('close-plan-btn');
const clearPlanBtn = document.getElementById('clear-plan-btn');
const exportObsidianBtn = document.getElementById('export-obsidian-btn');
const planListContainer = document.getElementById('plan-list');

const detailOverlay = document.getElementById('detail-overlay');
const detailModal = document.getElementById('detail-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalContent = document.getElementById('modal-content');

const toast = document.getElementById('toast');
const loadMoreTrigger = document.getElementById('load-more-trigger');

// 4. 辅助函数：翻译
function translate(text) {
    if (!text) return '';
    return TRANSLATIONS[text.toLowerCase()] || text;
}

// 5. 初始化加载
document.addEventListener('DOMContentLoaded', async () => {
    // 注册 PWA Service Worker
    registerServiceWorker();
    
    // 从 localStorage 加载训练计划
    loadPlan();
    
    try {
        // 加载数据
        const response = await fetch('exercises.json');
        if (!response.ok) throw new Error('无法读取 exercises.json 数据文件');
        allExercises = await response.json();
        
        // 动态填充过滤选项
        buildFilterOptions();
        
        // 初始化动作展示
        filteredExercises = [...allExercises];
        renderExercises();
        setupLazyLoad();
        
        // 绑定交互事件
        bindEvents();
    } catch (error) {
        console.error('初始化失败:', error);
        exercisesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                <p style="font-size: 18px; margin-bottom: 10px;">⚠️ 数据加载失败</p>
                <p style="font-size: 14px; opacity: 0.7;">${error.message}</p>
            </div>
        `;
    }
});

// 6. 注册 PWA Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker 注册成功'))
            .catch(err => console.error('Service Worker 注册失败:', err));
    }
}

// 7. 构建侧边栏过滤选项
function buildFilterOptions() {
    // 身体部位
    const parts = [...new Set(allExercises.map(x => x.body_part).filter(Boolean))].sort();
    parts.forEach(part => {
        const label = document.createElement('label');
        label.className = 'filter-pill';
        label.dataset.value = part;
        label.innerHTML = `
            <input type="radio" name="bodyPart" value="${part}">
            ${translate(part)}
        `;
        bodyPartsGroup.appendChild(label);
    });

    // 训练肌群
    const targets = [...new Set(allExercises.map(x => x.target).filter(Boolean))].sort();
    targets.forEach(target => {
        const label = document.createElement('label');
        label.className = 'filter-pill';
        label.dataset.value = target;
        label.innerHTML = `
            <input type="radio" name="target" value="${target}">
            ${translate(target)}
        `;
        targetsGroup.appendChild(label);
    });

    // 训练器械
    const equipments = [...new Set(allExercises.map(x => x.equipment).filter(Boolean))].sort();
    equipments.forEach(eq => {
        const label = document.createElement('label');
        label.className = 'filter-pill';
        label.dataset.value = eq;
        label.innerHTML = `
            <input type="checkbox" name="equipment" value="${eq}">
            ${translate(eq)}
        `;
        equipmentsGroup.appendChild(label);
    });
}

// 8. 交叉检索与过滤逻辑
function filterExercises() {
    const query = searchInput.value.toLowerCase().trim();
    
    // 筛选：身体部位 (单选)
    const selectedBodyPartEl = bodyPartsGroup.querySelector('input[name="bodyPart"]:checked');
    const selectedBodyPart = selectedBodyPartEl ? selectedBodyPartEl.value : 'all';
    
    // 筛选：训练肌群 (单选)
    const selectedTargetEl = targetsGroup.querySelector('input[name="target"]:checked');
    const selectedTarget = selectedTargetEl ? selectedTargetEl.value : 'all';
    
    // 筛选：训练器械 (多选)
    const checkedEqs = Array.from(equipmentsGroup.querySelectorAll('input[name="equipment"]:checked'))
                            .map(input => input.value);

    filteredExercises = allExercises.filter(item => {
        // 搜索词过滤
        if (query) {
            const nameMatch = item.name && item.name.toLowerCase().includes(query);
            const bodyPartMatch = item.body_part && item.body_part.toLowerCase().includes(query);
            const targetMatch = item.target && item.target.toLowerCase().includes(query);
            const equipmentMatch = item.equipment && item.equipment.toLowerCase().includes(query);
            
            // 中文翻译搜索支持
            const transBodyPart = translate(item.body_part).includes(query);
            const transTarget = translate(item.target).includes(query);
            const transEquipment = translate(item.equipment).includes(query);
            
            if (!nameMatch && !bodyPartMatch && !targetMatch && !equipmentMatch && 
                !transBodyPart && !transTarget && !transEquipment) {
                return false;
            }
        }
        
        // 身体部位过滤
        if (selectedBodyPart !== 'all' && item.body_part !== selectedBodyPart) {
            return false;
        }
        
        // 训练肌群过滤
        if (selectedTarget !== 'all' && item.target !== selectedTarget) {
            return false;
        }
        
        // 训练器械过滤
        if (checkedEqs.length > 0 && !checkedEqs.includes(item.equipment)) {
            return false;
        }
        
        return true;
    });

    visibleCount = 20;
    renderExercises();
}

// 9. 渲染卡片网格
function renderExercises() {
    exercisesGrid.innerHTML = '';
    totalCountSpan.textContent = filteredExercises.length;
    
    if (filteredExercises.length === 0) {
        exercisesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-secondary);">
                <p style="font-size: 16px;">🔍 没有找到符合要求的动作</p>
                <p style="font-size: 13px; opacity: 0.6; margin-top: 5px;">请尝试更改筛选条件或清空搜索框</p>
            </div>
        `;
        loadMoreTrigger.style.display = 'none';
        return;
    }
    
    appendCards(0, visibleCount);
    
    if (filteredExercises.length > visibleCount) {
        loadMoreTrigger.style.display = 'flex';
    } else {
        loadMoreTrigger.style.display = 'none';
    }
}

// 惰性追加渲染动作卡片
function appendCards(startIndex, endIndex) {
    const chunk = filteredExercises.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();
    
    chunk.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.dataset.id = ex.id;
        
        // 获取中文动作简介 (如果有)
        const descText = ex.instructions?.zh || ex.instructions?.en || '暂无详细步骤说明。';
        const isAdded = plan.some(p => p.id === ex.id);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="exercise-name" title="${ex.name}">${ex.name}</div>
                <div class="exercise-tags">
                    ${ex.body_part ? `<span class="tag tag-bodypart">${translate(ex.body_part)}</span>` : ''}
                    ${ex.target ? `<span class="tag tag-target">${translate(ex.target)}</span>` : ''}
                    ${ex.equipment ? `<span class="tag tag-equipment">${translate(ex.equipment)}</span>` : ''}
                </div>
            </div>
            <div class="card-body">
                <p class="exercise-preview-desc">${descText}</p>
                <div class="card-actions">
                    <button class="add-to-plan-btn ${isAdded ? 'added' : ''}">
                        ${isAdded ? '✓ 已加入' : '+ 加入计划'}
                    </button>
                </div>
            </div>
        `;
        
        // 点击卡片本体打开详情模态框 (避开添加按钮)
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-plan-btn')) {
                togglePlanItem(ex, e.target);
            } else {
                openDetailModal(ex);
            }
        });
        
        fragment.appendChild(card);
    });
    
    exercisesGrid.appendChild(fragment);
}

// 10. 无限滚动懒加载配置
function setupLazyLoad() {
    if (observer) observer.disconnect();
    
    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && filteredExercises.length > visibleCount) {
            const prevCount = visibleCount;
            visibleCount = Math.min(visibleCount + 20, filteredExercises.length);
            appendCards(prevCount, visibleCount);
            
            if (visibleCount >= filteredExercises.length) {
                loadMoreTrigger.style.display = 'none';
            }
        }
    }, {
        rootMargin: '100px'
    });
    
    observer.observe(loadMoreTrigger);
}

// 11. 打开详情模态框
function openDetailModal(ex) {
    const steps = ex.instruction_steps?.zh || ex.instruction_steps?.en || [];
    let stepsHtml = '';
    
    if (steps.length > 0) {
        stepsHtml = steps.map((step, idx) => `
            <div class="step-item">
                <span class="step-num">${idx + 1}</span>
                <span class="step-text">${step}</span>
            </div>
        `).join('');
    } else {
        const fullDesc = ex.instructions?.zh || ex.instructions?.en || '暂无指令步骤。';
        stepsHtml = `<div class="step-item">${fullDesc}</div>`;
    }

    // 媒体资源适配 (GIF / 图片)
    let mediaHtml = '';
    if (ex.gif_url) {
        const fullGifPath = BASE_MEDIA_URL + ex.gif_url;
        mediaHtml = `
            <div class="modal-media-wrapper">
                <img src="${fullGifPath}" alt="${ex.name}" class="modal-media" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="media-placeholder" style="display: none;">
                    <div class="placeholder-icon">🏋️‍♂️</div>
                    <span>原声动作演示加载失败</span>
                </div>
            </div>
        `;
    } else {
        mediaHtml = `
            <div class="modal-media-wrapper">
                <div class="media-placeholder">
                    <div class="placeholder-icon">🏋️‍♂️</div>
                    <span>暂无动作演示动图</span>
                </div>
            </div>
        `;
    }

    modalContent.innerHTML = `
        ${mediaHtml}
        <div class="modal-body">
            <div class="modal-title-row">
                <h2>${ex.name}</h2>
            </div>
            <div class="modal-meta-badges">
                ${ex.body_part ? `<span class="tag tag-bodypart">${translate(ex.body_part)}</span>` : ''}
                ${ex.target ? `<span class="tag tag-target">${translate(ex.target)}</span>` : ''}
                ${ex.equipment ? `<span class="tag tag-equipment">${translate(ex.equipment)}</span>` : ''}
            </div>
            <h3 class="modal-instructions-title">动作步骤详解</h3>
            <div class="instructions-steps">
                ${stepsHtml}
            </div>
        </div>
    `;

    detailOverlay.classList.add('active');
    detailModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 锁住底层滚动
}

// 关闭详情模态框
function closeDetailModal() {
    detailOverlay.classList.remove('active');
    detailModal.classList.remove('active');
    document.body.style.overflow = '';
}

// 12. 计划管理核心逻辑 (今日训练计划)
function togglePlanItem(ex, buttonEl) {
    const idx = plan.findIndex(p => p.id === ex.id);
    if (idx === -1) {
        // 加入计划
        plan.push(ex);
        buttonEl.classList.add('added');
        buttonEl.textContent = '✓ 已加入';
        showToast(`已成功将动作 "${ex.name}" 加入计划`);
    } else {
        // 移出计划
        plan.splice(idx, 1);
        buttonEl.classList.remove('added');
        buttonEl.textContent = '+ 加入计划';
    }
    
    savePlan();
    updatePlanUI();
}

function savePlan() {
    localStorage.setItem('fitguide_plan', JSON.stringify(plan));
}

function loadPlan() {
    try {
        const stored = localStorage.getItem('fitguide_plan');
        plan = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('加载计划失败:', e);
        plan = [];
    }
}

function updatePlanUI() {
    // 更新 Badge 数量
    planBadge.textContent = plan.length;
    
    // 更新抽屉列表
    planListContainer.innerHTML = '';
    
    if (plan.length === 0) {
        planListContainer.innerHTML = `
            <div class="empty-plan-tip">
                <div class="tip-icon">💪</div>
                <p>还没有添加任何动作</p>
                <p class="sub-tip">在左侧列表点击“加入计划”开始吧！</p>
            </div>
        `;
        return;
    }
    
    plan.forEach(item => {
        const div = document.createElement('div');
        div.className = 'plan-item';
        div.innerHTML = `
            <div class="plan-item-info">
                <span class="plan-item-title">${item.name}</span>
                <span class="plan-item-subtitle">${translate(item.body_part)} | ${translate(item.equipment)}</span>
            </div>
            <button class="remove-item-btn" data-id="${item.id}" title="删除动作">✕</button>
        `;
        
        div.querySelector('.remove-item-btn').addEventListener('click', () => {
            removePlanItemById(item.id);
        });
        
        planListContainer.appendChild(div);
    });
}

function removePlanItemById(id) {
    plan = plan.filter(p => p.id !== id);
    savePlan();
    updatePlanUI();
    
    // 同步更新主网格中卡片上的按钮样式
    const cardEl = exercisesGrid.querySelector(`.exercise-card[data-id="${id}"]`);
    if (cardEl) {
        const btn = cardEl.querySelector('.add-to-plan-btn');
        if (btn) {
            btn.classList.remove('added');
            btn.textContent = '+ 加入计划';
        }
    }
}

function clearPlan() {
    if (plan.length === 0) return;
    if (confirm('确认清空今日训练计划吗？')) {
        plan = [];
        savePlan();
        updatePlanUI();
        
        // 恢复所有主网格中卡片按钮的初始状态
        exercisesGrid.querySelectorAll('.add-to-plan-btn.added').forEach(btn => {
            btn.classList.remove('added');
            btn.textContent = '+ 加入计划';
        });
        showToast('计划已清空');
    }
}

// 13. 导出至 Obsidian
function exportPlanToObsidian() {
    if (plan.length === 0) {
        showToast('今日计划中没有动作，无法导出！');
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let md = `---
title: 今日健身计划 [${todayStr}]
date: ${todayStr}
tags:
  - 健身/计划
  - 今日计划
status: 待执行
---

# 📅 今日健身计划 (${todayStr})

> [!NOTE]
> 今日共有 ${plan.length} 个训练动作。记得充分热身！

## 🏃 动作流程

`;

    plan.forEach((item, index) => {
        const steps = item.instruction_steps?.zh || item.instruction_steps?.en || [];
        md += `### ${index + 1}. ${item.name} (${translate(item.body_part)} / ${translate(item.equipment)})\n`;
        md += `- **目标部位**：${translate(item.body_part)} (${translate(item.target)})\n`;
        md += `- **使用器械**：${translate(item.equipment)}\n`;
        md += `- **训练步骤**：\n`;
        
        if (steps.length > 0) {
            steps.forEach((step, sIdx) => {
                md += `  ${sIdx + 1}. [ ] ${step}\n`;
            });
        } else {
            const desc = item.instructions?.zh || item.instructions?.en || '暂无步骤。';
            md += `  - [ ] ${desc}\n`;
        }
        md += `\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
        showToast('已复制 Obsidian 格式的 Markdown 计划！');
    }).catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败，请在控制台查看。');
        console.log(md);
    });
}

// 14. 消息提示 (Toast) 触发
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 15. 事件监听绑定
function bindEvents() {
    // 搜索输入逻辑
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() !== '') {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        filterExercises();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        filterExercises();
        searchInput.focus();
    });

    // 侧边栏单选与多选变更
    bodyPartsGroup.addEventListener('change', (e) => {
        if (e.target.name === 'bodyPart') {
            bodyPartsGroup.querySelectorAll('.filter-pill').forEach(pill => {
                pill.classList.remove('active');
            });
            e.target.closest('.filter-pill').classList.add('active');
            filterExercises();
        }
    });

    targetsGroup.addEventListener('change', (e) => {
        if (e.target.name === 'target') {
            targetsGroup.querySelectorAll('.filter-pill').forEach(pill => {
                pill.classList.remove('active');
            });
            e.target.closest('.filter-pill').classList.add('active');
            filterExercises();
        }
    });

    equipmentsGroup.addEventListener('change', (e) => {
        if (e.target.name === 'equipment') {
            const pill = e.target.closest('.filter-pill');
            if (e.target.checked) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
            filterExercises();
        }
    });

    // 抽屉展开与闭合
    togglePlanBtn.addEventListener('click', () => {
        updatePlanUI();
        planOverlay.classList.add('active');
        planDrawer.classList.add('active');
    });

    closePlanBtn.addEventListener('click', () => {
        planOverlay.classList.remove('active');
        planDrawer.classList.remove('active');
    });

    planOverlay.addEventListener('click', () => {
        planOverlay.classList.remove('active');
        planDrawer.classList.remove('active');
    });

    // 计划清空与导出按钮
    clearPlanBtn.addEventListener('click', clearPlan);
    exportObsidianBtn.addEventListener('click', exportPlanToObsidian);

    // 详情模态框关闭
    closeModalBtn.addEventListener('click', closeDetailModal);
    detailOverlay.addEventListener('click', closeDetailModal);

    // 手机端侧边栏筛选展开/收起
    mobileFilterTrigger.addEventListener('click', () => {
        filterSidebar.classList.add('active');
    });

    closeFilterBtn.addEventListener('click', () => {
        filterSidebar.classList.remove('active');
    });
}
