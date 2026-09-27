import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner]
})
export class SplashPage implements OnInit {
  public loadingMessage: string = 'Iniciando...';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Detecta si se navega con el estado de guardado
    this.route.queryParams.subscribe((params) => {
      if (params['estado'] === 'guardando') {
        this.loadingMessage = 'Guardando cuestionario';
      }
    });

    // Permanece el tiempo establecido y redirige a Home
    setTimeout(() => {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }, 2500);
  }
}