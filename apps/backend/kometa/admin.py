from django.contrib import admin

from .models import CompletionRequest, Conversation, Feedback, Match, Report, Task, TaskResponse, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'name', 'credit_balance', 'credit_reserved', 'account_status')
    search_fields = ('email', 'name')
    readonly_fields = ('id',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'owner', 'status', 'compensation', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')


admin.site.register(TaskResponse)
admin.site.register(CompletionRequest)
admin.site.register(Conversation)
admin.site.register(Match)
admin.site.register(Feedback)
admin.site.register(Report)
