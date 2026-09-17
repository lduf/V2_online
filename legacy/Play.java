import java.util.*;
public class Play{
//trout
   public static void main(String[] args){
		 		Scanner sc = new Scanner(System.in);
				clearScreen();
/*
***********************************************************
***********************************************************
CREATION DES PERSOS ET LANCEMENT DU JEU
***********************************************************
***********************************************************
*/
				// STEP 1 : INITIALISATION DE NOMBRE_DE_JOUEURS ET RÉCUPÉRATION DES NOMS DES JOUEURS et création des persoS
				/*
				 * nb : les perso sont dans un tableau plus simple pour gérer le tour à tour => %NOMBRE_DE_JOUEURS
				 */
				 int nbjr = -1;
				 while(nbjr<2 ){
					 System.out.println("Entrez le nombre de joueurs présents : ");
					 nbjr =sc.nextInt();
					}
				 final int NOMBRE_DE_JOUEURS = nbjr;
				 String[] j = ini(NOMBRE_DE_JOUEURS);



		Personnage[] perso = new Personnage[NOMBRE_DE_JOUEURS]; //Le tableau perso contient tous les persos => variable indispensable
		for(int a=0; a<NOMBRE_DE_JOUEURS;a++){ // on initialise perso
			perso[a]=new Personnage(j[a], NOMBRE_DE_JOUEURS);
		}

		// STEP 3 PRESENTATION DES CARACTERISTIQUES DES PERSOS

			for(Personnage p : perso){
				clearScreen();
				p.Presentation();
			 	PauseUntil("Tu as tout lu ?");
				clearScreen();
			}

			// BLABLA du début du jeu + tirage aléatoire

			System.out.println("*********************");
			System.out.println("Le jeu va débuter. Le but est d'attaquer l'adversaire et de lui ôter toute sa vie. Vous avez à votre disposition votre main que vous pourrez consulter.");
			System.out.println("Chaque sort utilisé est remplacé par un nouveau, tiré au hasard parmi la liste des sorts.");
			System.out.println("Procédons au tirage aléatoire pour savoir qui débute la partie.");
			int nbtour = ((int)(Math.random()*10))%NOMBRE_DE_JOUEURS;
			System.out.println("");
			System.out.println(perso[nbtour].GetName()+" commence. \n Que le meilleur gagne !\n\n");
			PauseUntil(perso[nbtour].GetName()+" Es-tu prêt à débuter la partie ?");
				clearScreen();
/*
***********************************************************
***********************************************************
DEBUT DU JEU
***********************************************************
***********************************************************
*/
			while(!victoire(perso)){//WHILE ENCORE DES GENS EN VIE le jeu se déroule
				// Ici on initialise les premieres variables
					int choix;
					int FinTour = 0;
					int confirmation = -1;
					int choisir = -1;
			if(perso[nbtour%NOMBRE_DE_JOUEURS].GetVie()>0){//on vérifie que le joueur est encore en vie, si il est mort, on passe au joueur suivant
				do{
					String name = perso[nbtour%NOMBRE_DE_JOUEURS].GetName();
					System.out.println("******* "+name);
					System.out.println();
					menu();
					System.out.println("Quel est ton choix ?");
					choix = sc.nextInt();
					switch(choix) {
/*
//////////
Attaque d'un autre joueur
//////////
*/
						// CAS 0 ON RENTRE 0 => ON VEUT ATTAQUER
						case 0:

						int choisirAdversaire=-1;
						Personnage adversaire = perso[nbtour%NOMBRE_DE_JOUEURS];//oui oui je suis mon propre adversaire au début
						clearScreen(); // Affichage des stats du joueurs
						System.out.println("*****"+perso[nbtour%NOMBRE_DE_JOUEURS].GetName());
						System.out.println("Pour rappel, tu possèdes "+perso[nbtour%NOMBRE_DE_JOUEURS].GetVie()+" points de vie et "+perso[nbtour%NOMBRE_DE_JOUEURS].GetAttaque()+" points d'attaque");
						System.out.println("");

						if(NOMBRE_DE_JOUEURS>2){// Si plus de 2 joueurs dans la game
							// On affiche tous les joueurs
							int a=0;
							for(Personnage p : perso){
								if(a!=nbtour%NOMBRE_DE_JOUEURS && p.GetVie()>0){ // On affiche les persos encore en vie
									System.out.println("["+a+"] : "+p.GetName() + " || Vie : "+p.GetVie()+" || Attaque : "+p.GetAttaque());
								}
								a++;
							}
							//On choisit un joueur sur on va taper, on ne peut pas s'attaquer soi-même ou un joueur mort/inexistant
							while(choisirAdversaire<0 || choisirAdversaire >NOMBRE_DE_JOUEURS || perso[choisirAdversaire].GetVie()<0 || choisirAdversaire == nbtour%NOMBRE_DE_JOUEURS){
							System.out.println("Choisis ton adversaire pour ce tour …");
									choisirAdversaire = (int)sc.nextInt();
								}
								adversaire=perso[choisirAdversaire];// adversaire devient mon vrai adversaire
								System.out.println("Tu vas attaquer "+adversaire.GetName());//j'affiche le nom de l'adversaire
						}
						else if(NOMBRE_DE_JOUEURS == 2){ // Si 2 joueurs -> on tape sur l'autre
							adversaire=perso[(nbtour+1)%2];
						}
						// On affiche les sorts dans notre mai,
						System.out.println("Choisis un sort entre les 5 suivants (entre 1 et 5): ");
						System.out.println("\n");
						System.out.println(perso[nbtour%NOMBRE_DE_JOUEURS].GetHand()); //J'affiche ma main
						System.out.println("");
						System.out.println("[0] revenir un menu principal");
						while(choisir<0 || choisir >perso[0].NB_MAX_SORT){ // Je choisis un numéro de sort à lancer
						System.out.println("\n Tape ton numéro favori ! ");
								choisir = (int)sc.nextInt();
							}
						clearScreen();
						if(choisir != 0){ // Si on ne veut pas revenir en arrière on lance le sort
							perso[nbtour%NOMBRE_DE_JOUEURS].lancerSort(adversaire,choisir-1);

						confirmation = 1;
						FinTour = 1; // permet de finir le tour après avoir lancé un sort

						// Affichage des stats après utilisation du sort
						for(int k=nbtour; k<NOMBRE_DE_JOUEURS+nbtour; k++){
							System.out.println(perso[k%NOMBRE_DE_JOUEURS].GetName()+":");
							System.out.println("");
							System.out.println("Attaque : " + perso[k%NOMBRE_DE_JOUEURS].GetAttaque());
							System.out.println("Vie : " + perso[k%NOMBRE_DE_JOUEURS].GetVie());
							System.out.println("");
							System.out.println("**************");
							System.out.println("");

						}
						PauseUntil("Votre tour est maintenant terminé");
						break;
					}else{
						choisir =-1;
						break;
					}
/*
	//////////
Affiche des stats
	//////////
*/
  					case 1:
						clearScreen();

						// affichage des stats
						for(int k=nbtour; k<NOMBRE_DE_JOUEURS+nbtour; k++){
							System.out.println(perso[k%NOMBRE_DE_JOUEURS].GetName()+":");
							System.out.println("");
							System.out.println("Attaque : " + perso[k%NOMBRE_DE_JOUEURS].GetAttaque());
							System.out.println("Vie : " + perso[k%NOMBRE_DE_JOUEURS].GetVie());
							System.out.println("");
							System.out.println("**************");
							System.out.println("");
						}

    					break;
/*
//////////
Défaussage d'un sort => on retire le sort de notre choix dans notre hand et défaussage d'une carte aléatoire chez un joueur aléatoire
//////////
*/
						case 2:
						clearScreen();
						// on affiche les sorts
						System.out.println("Choisis un sort entre les 5 suivants (entre 1 et 5): ");
						System.out.println("\n");
						System.out.println(perso[nbtour%NOMBRE_DE_JOUEURS].GetHand());
						System.out.println("[0] revenir au menu principal");
						System.out.println("Quel est ton choix ? Attention, choix définitif ! (Ni repris ni remboursable)");
						while(choisir<0 || choisir >perso[0].NB_MAX_SORT){// choix du numéro du sort
								choisir = (int)sc.nextInt();
							}
							if(choisir != 0){// si choix est un choix de sort on use les méthodes adéquates
								int randomTr=nbtour%NOMBRE_DE_JOUEURS;// numéro d'un joeur aléatoire
							do {
								 randomTr = (nbtour+(int)(Math.random()*NOMBRE_DE_JOUEURS))%NOMBRE_DE_JOUEURS;
							} while (randomTr==nbtour%NOMBRE_DE_JOUEURS);//Si on tombe sur notre numéro on en tire un nouveau numéro
							/*
								nb : pas très efficace comme solution,
								plus propre en tirant un tour entre tour actuel (moi) et et tour+NOMBRE_DE_JOUEURS-1 (donc juste avant moi) mais ne marche pas, pas le temps de comprendre,
								donc solution plus barbare
							*/
						Sort[] replace = perso[nbtour%NOMBRE_DE_JOUEURS].ReplaceSort(choisir-1,perso[randomTr]); // On remplace les sorts
						clearScreen();//Affichage
						System.out.println("Tu as défaussé un sort à "+perso[randomTr].GetName()+", il a été remplacé par : "+replace[1].GetName());
						System.out.println("\n \n Le sort "+choisir+ " a été remplacé par "+replace[0].GetName()+" ! Je te laisse regarder ta main une nouvelle fois :\n\n");
						System.out.println(perso[nbtour%NOMBRE_DE_JOUEURS].GetHand());
						PauseUntil("");
						FinTour = 1;
							break;
					}else{// Si on a chosit 0 => retour au menu
						choisir=-1;
						clearScreen();
						break;
					}
/*
//////////
Affichage de ma main
//////////
*/
						case 3:
							clearScreen();
							System.out.println(perso[nbtour%NOMBRE_DE_JOUEURS].GetName()+":");
							System.out.println("Voilà ta main : ");
							System.out.println(perso[nbtour%NOMBRE_DE_JOUEURS].GetHand());
						break;
/*
//////////
Fin de tour
//////////
*/
						case 4:
						clearScreen();
							FinTour = 1;
							System.out.println("Appuie sur 1 pour Confirmer / Appuie sur 2 pour Annuler");
							confirmation = sc.nextInt();
							if(confirmation == 2){
								FinTour = 0;
							}
    					break;
  					default:
						System.out.println("Tu es un petit rigolo toi dis donc :)");
					}
				}while(FinTour == 0);
			}//fin if personnage encore en vie
					clearScreen();
					nbtour++;
			}//Fin du while tant que des gens en vie
			clearScreen();

			Personnage winner = perso[0]; // Encore une solution pas suberbe mais qui a le mérite de marcher
			if(victoire(perso)){
				for(Personnage p : perso){
					if(p.GetVie()>0)  winner = p;
				}
			}
System.out.println("Je crois que "+winner.GetName()+" a gagné la game");//Plus efficace de Trouver le vainqueur avec le nbtour
   }
/*
***********************************************************
***********************************************************
METHODES UTILISIEES
***********************************************************
***********************************************************
*/
/*
//////////
INITIALISATION : demande les noms au joueurs
//////////
*/
	 public static String[] ini(int NOMBRE_DE_JOUEURS){
 		Scanner sc = new Scanner(System.in);
 		String[] j = new String[NOMBRE_DE_JOUEURS];
 			clearScreen();
 			for(int a=0; a<NOMBRE_DE_JOUEURS;a++){
 				System.out.println("*********** Joueur "+(a+1)+"/"+NOMBRE_DE_JOUEURS+" ***********");
 				System.out.println("Salut à toi joueur "+(a+1));
 				System.out.println("Quel est ton nom ?");
 					System.out.println("*******************");
 				j[a]= sc.nextLine();
 				clearScreen();
 			}
 		System.out.println("Merci à toi "+j[NOMBRE_DE_JOUEURS-1]+"\nJe vais préparer vos jeux. Mouahahahaha");
 		return j;
 	}
/*
//////////
Pour avoir une jolie console => marche sous linus et mac mais pb avec windows -> idéé utilisé les commandes du cmd comme cls
//////////
*/
   public static void clearScreen() {
    System.out.print("\033[H\033[2J");
    System.out.flush();
		//exec("cls");0
	}
/*
//////////
Met en pause l'execution jusqu'a ce que le joueurs tape 1 pour contiuer
//////////
*/
	public static void PauseUntil(String text){
		Scanner sc = new Scanner(System.in);
		int pass = 0;
		do {
			System.out.println(text+"\n Tape 1 sur ton clavier pour continuer.");
			pass = sc.nextInt();
		} while (pass!=1);
	}
/*
//////////
Affichage du menu
//////////
*/
	public static void menu(){
		System.out.println("Choisis ici tes options : ");
		System.out.println("");
		System.out.println("[0] : Lancer un sort");
		System.out.println("[1] : Regarder les stats");
		System.out.println("[2] : Défaussage : Défausse la carte de ton choix de ta main et défausse une carte aléatoire à un adversaire ");
		System.out.println("[3] : Voir ma main");
		System.out.println("[4] : Finir le tour");
		System.out.println("");
	}
/*
//////////
Condition de victoire : je suis le dernier joueur avec de la vie
//////////
*/
	public static boolean victoire(Personnage[] perso){
		int alive=0;
		for(Personnage p : perso){
			if(p.GetVie()>0) alive++;
		}
		return (alive<2);
	}

}
/*
IDÉES D'EXTENTION DU Jeu
0.0 clearScreen windows
0.1 éviter les erreurs avec les scanner (si on tape un char au lieu d'un int le jeu ne plante pas mais redemande de saisir la valeur)

Pour aller plus loin :

1. Choix entre partie courte, moyenne ou longue
		=> Pas dificile il faut juste moduler la vie initiale
2. Json avec les valeurs comme nombre de sort max et nombre d'item dans une main
		Plus long :
			=> Créer le Json
			=> lire les valeurs json dans les bonnes classes
		(pas si dur en vrai)
3. Maître du Json
			=> Créer un programme permettant de modifier les valeurs des Json sans avoir a les ouvrir (Permet de ne pas faire d'erreur dans ces Jsons)
			=> Programme adapté pour tout type de Json
		(demande de réflechir un peu)
4. Un peu de design
		=> utiliser des fenêtres et plus la console pour jouer


*/
