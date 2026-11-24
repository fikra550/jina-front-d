// Redux/permissionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const api = axios.create({ baseURL: 'https://jina-back-d-production.up.railway.app/api' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const fetchPages = createAsyncThunk('permissions/fetchPages', async () => {
    const res = await api.get('/admin/permissions/pages');
    return res.data.pages;
});

export const fetchUserPermissions = createAsyncThunk('permissions/fetchUserPermissions', async (userId) => {
    const res = await api.get(`/admin/permissions/user/${userId}`);
    return { userId, permissions: res.data.permissions };
});

export const assignPermission = createAsyncThunk('permissions/assign', async ({ userId, pageSlug, durationMinutes }) => {
    const res = await api.post('/admin/permissions/assign', { 
        user_id: userId, 
        page_slug: pageSlug, 
        duration_minutes: durationMinutes 
    });
    // Notify other tabs (for the target user) that permissions have changed
    localStorage.setItem('permissionsChanged', Date.now().toString());
    return { userId, permission: res.data.permission };
});

export const revokePermission = createAsyncThunk('permissions/revoke', async ({ userId, pageSlug }) => {
    await api.delete('/admin/permissions/revoke', { data: { user_id: userId, page_slug: pageSlug } });
    localStorage.setItem('permissionsChanged', Date.now().toString());
    return { userId, pageSlug };
});

// id of the logged-in user (same source the rest of this file already uses)
const getCurrentUserId = () => {
    try {
        return JSON.parse(localStorage.getItem('user'))?.id ?? null;
    } catch {
        return null;
    }
};

export const fetchMyPermissions = createAsyncThunk('permissions/fetchMyPermissions', async () => {
    const res = await api.get('/admin/permissions/me');
    return res.data.permissions;
});

const permissionSlice = createSlice({
    name: 'permissions',
    initialState: {
        pages: {},
        userPermissions: {},
        myPermissions: [],
        loading: false,
        // id of the user whose permissions have been fetched at least once
        // (ProtectedRoute waits for this before deciding to redirect)
        loadedFor: null,
    },
    reducers: {
        updateMyPermissions: (state, action) => {
            state.myPermissions = action.payload;
        },
        addMyPermission: (state, action) => {
            const newPerm = action.payload;
            const index = state.myPermissions.findIndex(p => p.page_slug === newPerm.page_slug);
            if (index !== -1) {
                state.myPermissions[index] = newPerm;
            } else {
                state.myPermissions.push(newPerm);
            }
        },
        removeMyPermission: (state, action) => {
            const pageSlug = action.payload;
            state.myPermissions = state.myPermissions.filter(p => p.page_slug !== pageSlug);
        },
        // call on logout so the next user starts clean
        resetMyPermissions: (state) => {
            state.myPermissions = [];
            state.loadedFor = null;
            state.loading = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPages.fulfilled, (state, action) => {
                state.pages = action.payload;
            })
            .addCase(fetchUserPermissions.fulfilled, (state, action) => {
                state.userPermissions[action.payload.userId] = action.payload.permissions;
            })
            .addCase(assignPermission.fulfilled, (state, action) => {
                const { userId, permission } = action.payload;
                if (!state.userPermissions[userId]) state.userPermissions[userId] = [];
                const existing = state.userPermissions[userId].find(p => p.page_slug === permission.page_slug);
                if (existing) {
                    Object.assign(existing, permission);
                } else {
                    state.userPermissions[userId].push(permission);
                }
                // If the permission was assigned to the current user, update myPermissions
                const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
                if (currentUserId && currentUserId === userId) {
                    const permIndex = state.myPermissions.findIndex(p => p.page_slug === permission.page_slug);
                    if (permIndex !== -1) {
                        state.myPermissions[permIndex] = permission;
                    } else {
                        state.myPermissions.push(permission);
                    }
                }
            })
            .addCase(revokePermission.fulfilled, (state, action) => {
                const { userId, pageSlug } = action.payload;
                if (state.userPermissions[userId]) {
                    state.userPermissions[userId] = state.userPermissions[userId].filter(p => p.page_slug !== pageSlug);
                }
                const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
                if (currentUserId && currentUserId === userId) {
                    state.myPermissions = state.myPermissions.filter(p => p.page_slug !== pageSlug);
                }
            })
            .addCase(fetchMyPermissions.pending, (state) => {
                // only show the "loading" state for the first fetch (not the 30s refresh)
                if (state.loadedFor !== getCurrentUserId()) state.loading = true;
            })
            .addCase(fetchMyPermissions.fulfilled, (state, action) => {
                state.myPermissions = action.payload;
                state.loading = false;
                state.loadedFor = getCurrentUserId();
            })
            .addCase(fetchMyPermissions.rejected, (state) => {
                // never leave the app stuck on the spinner if the request fails
                state.loading = false;
                state.loadedFor = getCurrentUserId();
            });
    },
});

export const { updateMyPermissions, addMyPermission, removeMyPermission, resetMyPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;